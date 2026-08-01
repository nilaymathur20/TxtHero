import asyncio
import re
import logging
import secrets
from contextlib import suppress
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect
from pycrdt import Doc
from pycrdt.websocket import WebsocketServer, YRoom

from app.config import STORAGE_DIR

DOCUMENT_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,128}$")
LIVE_SESSION_PATTERN = re.compile(r"^[0-9]{15}$")
LIVE_SESSION_TTL = timedelta(hours=1)
SNAPSHOT_INTERVAL_SECONDS = 5
logger = logging.getLogger(__name__)


def validate_document_id(document_id: str) -> str:
    if not DOCUMENT_ID_PATTERN.fullmatch(document_id):
        raise ValueError("Document IDs may contain only letters, numbers, underscores, and hyphens")
    return document_id


class FastAPIWebsocketAdapter:
    """Adapt Starlette's WebSocket to pycrdt-websocket's small channel API."""

    def __init__(self, websocket: WebSocket, document_id: str):
        self.websocket = websocket
        self._path = document_id

    @property
    def path(self) -> str:
        return self._path

    def __aiter__(self):
        return self

    async def __anext__(self) -> bytes:
        try:
            return await self.websocket.receive_bytes()
        except (WebSocketDisconnect, RuntimeError):
            raise StopAsyncIteration from None

    async def send(self, message: bytes) -> None:
        await self.websocket.send_bytes(message)


class ConnectionManager:
    """Own Yjs-compatible rooms, presence, and durable room snapshots."""

    def __init__(self, storage_dir: Path | None = None):
        self.storage_dir = (storage_dir or STORAGE_DIR) / ".collaboration"
        self.server = WebsocketServer(auto_clean_rooms=False)
        self._server_task: asyncio.Task | None = None
        self._persistence_task: asyncio.Task | None = None
        self._room_lock = asyncio.Lock()
        self._dirty_rooms: dict[str, int] = {}
        self._subscriptions: dict[str, Any] = {}
        self._created_at: dict[str, datetime] = {}
        self._last_activity: dict[str, datetime] = {}
        self._live_sessions: dict[str, datetime] = {}

    def create_live_session(self) -> tuple[str, datetime]:
        """Create an unguessable numeric room identifier with a bounded lifetime."""
        now = datetime.now(timezone.utc)
        self._purge_expired_sessions(now)
        while True:
            session_id = str(secrets.randbelow(900_000_000_000_000) + 100_000_000_000_000)
            if session_id not in self._live_sessions:
                break
        expires_at = now + LIVE_SESSION_TTL
        self._live_sessions[session_id] = expires_at
        return session_id, expires_at

    def require_live_session(self, document_id: str) -> str:
        """Reject unregistered or expired invitation numbers."""
        now = datetime.now(timezone.utc)
        self._purge_expired_sessions(now)
        if not LIVE_SESSION_PATTERN.fullmatch(document_id):
            raise ValueError("Live session unavailable")
        if self._live_sessions.get(document_id, now) <= now:
            raise ValueError("Live session unavailable")
        return document_id

    def _purge_expired_sessions(self, now: datetime) -> None:
        for session_id, expires_at in list(self._live_sessions.items()):
            if expires_at <= now:
                self._live_sessions.pop(session_id, None)

    async def start(self) -> None:
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self._server_task = asyncio.create_task(self.server.start(), name="collaboration-server")
        await self.server.started.wait()
        self._persistence_task = asyncio.create_task(
            self._persistence_loop(), name="collaboration-persistence"
        )

    async def stop(self) -> None:
        if self._persistence_task:
            self._persistence_task.cancel()
            with suppress(asyncio.CancelledError):
                await self._persistence_task
        await self.save_all()
        if self._server_task:
            await self.server.stop()
            with suppress(asyncio.CancelledError):
                await self._server_task

    async def connect(self, websocket: WebSocket, document_id: str) -> None:
        document_id = self.require_live_session(document_id)
        room = await self._get_or_create_room(document_id)
        await websocket.accept()
        adapter = FastAPIWebsocketAdapter(websocket, document_id)
        self._touch(document_id)
        logger.info("Collaboration client connected to room %s", document_id)
        try:
            await room.serve(adapter)
        finally:
            self._touch(document_id)
            logger.info("Collaboration client left room %s", document_id)
            if not room.clients:
                await self.save_room(document_id, force=True)

    async def _get_or_create_room(self, document_id: str) -> YRoom:
        async with self._room_lock:
            existing = self.server.rooms.get(document_id)
            if existing is not None:
                return existing

            ydoc = Doc()
            snapshot = self._snapshot_path(document_id)
            if snapshot.is_file():
                ydoc.apply_update(await asyncio.to_thread(snapshot.read_bytes))

            room = YRoom(ydoc=ydoc)
            self.server.rooms[document_id] = room
            now = datetime.now(timezone.utc)
            self._created_at[document_id] = now
            self._last_activity[document_id] = now
            self._subscriptions[document_id] = ydoc.observe(
                lambda _event, room_id=document_id: self._mark_dirty(room_id)
            )
            await self.server.start_room(room)
            return room

    def active_users(self, document_id: str) -> list[dict[str, Any]]:
        validate_document_id(document_id)
        room = self.server.rooms.get(document_id)
        if room is None:
            return []

        users: list[dict[str, Any]] = []
        for client_id, state in room.awareness.states.items():
            user = state.get("user") if isinstance(state, dict) else None
            if not isinstance(user, dict):
                continue
            users.append(
                {
                    "id": str(user.get("id", client_id)),
                    "name": str(user.get("name", "Guest")),
                    "color": str(user.get("color", "#64748b")),
                    "client_id": int(client_id),
                }
            )
        return users

    def room_info(self, document_id: str) -> dict[str, Any] | None:
        """Build a JSON-friendly room snapshot for monitoring endpoints."""
        validate_document_id(document_id)
        room = self.server.rooms.get(document_id)
        if room is None:
            return None
        users = self.active_users(document_id)
        return {
            "document_id": document_id,
            "users": [
                {
                    "user_id": user["id"], "display_name": user["name"],
                    "color": user["color"], "client_id": user["client_id"],
                }
                for user in users
            ],
            "created_at": self._created_at[document_id],
            "last_activity": self._last_activity[document_id],
        }

    def room_stats(self) -> dict[str, Any]:
        """Return aggregate room and user counts without exposing CRDT data."""
        rooms = [self.room_info(room_id) for room_id in self.server.rooms]
        rooms = [room for room in rooms if room is not None]
        counts = {room["document_id"]: len(room["users"]) for room in rooms}
        return {
            "room_count": len(rooms), "total_users": sum(counts.values()),
            "per_room_user_count": counts, "rooms": rooms,
        }

    async def save_room(self, document_id: str, force: bool = False) -> None:
        room = self.server.rooms.get(document_id)
        if room is None or (not force and document_id not in self._dirty_rooms):
            return

        revision = self._dirty_rooms.get(document_id, 0)
        update = room.ydoc.get_update()
        path = self._snapshot_path(document_id)
        temporary = path.with_suffix(".tmp")

        def write_snapshot() -> None:
            temporary.write_bytes(update)
            temporary.replace(path)

        await asyncio.to_thread(write_snapshot)
        if self._dirty_rooms.get(document_id) == revision:
            self._dirty_rooms.pop(document_id, None)

    async def save_all(self) -> None:
        await asyncio.gather(
            *(self.save_room(document_id, force=True) for document_id in list(self.server.rooms))
        )

    async def _persistence_loop(self) -> None:
        while True:
            await asyncio.sleep(SNAPSHOT_INTERVAL_SECONDS)
            await asyncio.gather(
                *(self.save_room(document_id) for document_id in list(self._dirty_rooms))
            )

    def _mark_dirty(self, document_id: str) -> None:
        self._dirty_rooms[document_id] = self._dirty_rooms.get(document_id, 0) + 1
        self._touch(document_id)

    def _touch(self, document_id: str) -> None:
        """Record activity time for diagnostics and future room expiry policies."""
        self._last_activity[document_id] = datetime.now(timezone.utc)

    def _snapshot_path(self, document_id: str) -> Path:
        return self.storage_dir / f"{document_id}.yjs"


collaboration_manager = ConnectionManager()
