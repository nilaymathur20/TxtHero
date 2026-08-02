import asyncio
import re
import logging
import secrets
import hashlib
import os
from dataclasses import dataclass, field
from contextlib import suppress
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect
from pycrdt import Doc
from pycrdt.websocket import WebsocketServer, YRoom

from app.config import STORAGE_DIR

DOCUMENT_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,128}$")
LIVE_SESSION_PATTERN = re.compile(r"^[0-9]{6}$")
LIVE_SESSION_TTL = timedelta(hours=2)
SNAPSHOT_INTERVAL_SECONDS = 5
logger = logging.getLogger(__name__)


@dataclass
class LiveParticipant:
    participant_id: str
    user_id: str
    display_name: str
    color: str
    role: str
    status: str
    token_hash: str | None = None
    request_id: str | None = None


@dataclass
class LiveSessionRecord:
    session_id: str
    session_uuid: str
    host_id: str
    mode: str
    require_approval: bool
    max_participants: int
    created_at: datetime
    expires_at: datetime
    status: str = "open"
    participants: dict[str, LiveParticipant] = field(default_factory=dict)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def validate_document_id(document_id: str) -> str:
    if not DOCUMENT_ID_PATTERN.fullmatch(document_id):
        raise ValueError("Document IDs may contain only letters, numbers, underscores, and hyphens")
    return document_id


class FastAPIWebsocketAdapter:
    """Adapt Starlette's WebSocket to pycrdt-websocket's small channel API."""

    def __init__(self, websocket: WebSocket, document_id: str, participant: LiveParticipant):
        self.websocket = websocket
        self._path = document_id
        self.participant = participant

    @property
    def path(self) -> str:
        return self._path

    def __aiter__(self):
        return self

    async def __anext__(self) -> bytes:
        while True:
            try:
                message = await self.websocket.receive_bytes()
                if self.participant.status == "removed":
                    await self.websocket.close(code=1008, reason="You were removed from this session by the host.")
                    raise StopAsyncIteration
                # y-websocket: outer type 0 is sync; inner 1/2 carries document
                # updates. Viewers may request state (inner 0) and send awareness,
                # but the server never relays their document mutations.
                if self.participant.role == "viewer" and len(message) > 1 and message[0] == 0 and message[1] in {1, 2}:
                    continue
                return message
            except (WebSocketDisconnect, RuntimeError):
                raise StopAsyncIteration from None

    async def send(self, message: bytes) -> None:
        await self.websocket.send_bytes(message)


class ConnectionManager:
    """Own Yjs-compatible rooms, presence, and durable room snapshots."""

    def __init__(self, storage_dir: Path | None = None):
        self.storage_dir = (storage_dir or STORAGE_DIR) / ".collaboration"
        self.persist_updates = os.getenv("COLLAB_PERSIST_UPDATES", "false").lower() == "true"
        self.server = WebsocketServer(auto_clean_rooms=False)
        self._server_task: asyncio.Task | None = None
        self._persistence_task: asyncio.Task | None = None
        self._room_lock = asyncio.Lock()
        self._dirty_rooms: dict[str, int] = {}
        self._subscriptions: dict[str, Any] = {}
        self._created_at: dict[str, datetime] = {}
        self._last_activity: dict[str, datetime] = {}
        self._live_sessions: dict[str, LiveSessionRecord] = {}
        self._join_requests: dict[str, tuple[str, str]] = {}
        self._join_attempts: dict[str, list[datetime]] = {}

    def check_join_rate(self, client_key: str) -> None:
        """Limit code probing to five attempts per client per minute."""
        now = datetime.now(timezone.utc)
        recent = [item for item in self._join_attempts.get(client_key, []) if now - item < timedelta(minutes=1)]
        if len(recent) >= 5:
            raise ValueError("Too many join attempts. Wait a minute and try again.")
        recent.append(now)
        self._join_attempts[client_key] = recent

    def create_live_session(self, host_id: str, display_name: str, color: str, mode: str,
                            require_approval: bool, expires_in_minutes: int,
                            max_participants: int) -> tuple[LiveSessionRecord, str, LiveParticipant]:
        """Create a short discovery code plus a separate high-entropy host credential."""
        now = datetime.now(timezone.utc)
        self._purge_expired_sessions(now)
        while True:
            session_id = f"{secrets.randbelow(1_000_000):06d}"
            if session_id not in self._live_sessions:
                break
        token = secrets.token_urlsafe(32)
        participant = LiveParticipant(secrets.token_urlsafe(12), host_id, display_name.strip(), color,
                                      "host", "online", _hash_token(token))
        session = LiveSessionRecord(session_id, secrets.token_urlsafe(24), host_id, mode,
                                    require_approval, 2 if mode == "1:1" else max_participants,
                                    now, now + timedelta(minutes=expires_in_minutes))
        session.participants[participant.participant_id] = participant
        self._live_sessions[session_id] = session
        return session, token, participant

    def request_join(self, session_id: str, user_id: str, display_name: str,
                     color: str) -> tuple[LiveSessionRecord, LiveParticipant, str | None]:
        session = self.get_live_session(session_id)
        active = [p for p in session.participants.values() if p.status not in {"removed", "rejected"}]
        if len(active) >= session.max_participants:
            raise ValueError("This session has reached its participant limit.")
        request_id = secrets.token_urlsafe(24)
        token = None if session.require_approval else secrets.token_urlsafe(32)
        participant = LiveParticipant(secrets.token_urlsafe(12), user_id, display_name.strip(), color,
                                      "editor", "pending" if session.require_approval else "offline",
                                      _hash_token(token) if token else None, request_id)
        session.participants[participant.participant_id] = participant
        self._join_requests[request_id] = (session_id, participant.participant_id)
        return session, participant, token

    def join_status(self, request_id: str) -> tuple[LiveSessionRecord, LiveParticipant, str | None]:
        reference = self._join_requests.get(request_id)
        if not reference:
            raise ValueError("That join request is no longer available.")
        session = self.get_live_session(reference[0])
        participant = session.participants[reference[1]]
        if participant.status == "removed":
            return session, participant, None
        return session, participant, getattr(participant, "_issued_token", None)

    def approve(self, session_id: str, request_id: str, host_token: str, approved: bool) -> LiveParticipant:
        session, host = self.authorize(session_id, host_token, roles={"host"})
        reference = self._join_requests.get(request_id)
        if not reference or reference[0] != session.session_id:
            raise ValueError("Join request unavailable")
        participant = session.participants[reference[1]]
        if not approved:
            participant.status = "removed"
            return participant
        token = secrets.token_urlsafe(32)
        participant.token_hash = _hash_token(token)
        participant.status = "offline"
        participant._issued_token = token
        return participant

    def authorize(self, session_id: str, token: str, roles: set[str] | None = None) -> tuple[LiveSessionRecord, LiveParticipant]:
        session = self.get_live_session(session_id)
        digest = _hash_token(token)
        participant = next((p for p in session.participants.values() if p.token_hash == digest), None)
        if not participant or participant.status == "removed" or (roles and participant.role not in roles):
            raise ValueError("You don't have permission to access this session.")
        return session, participant

    def get_live_session(self, session_id: str) -> LiveSessionRecord:
        now = datetime.now(timezone.utc)
        self._purge_expired_sessions(now)
        if not LIVE_SESSION_PATTERN.fullmatch(session_id) or session_id not in self._live_sessions:
            raise ValueError("That code doesn't match any active session.")
        session = self._live_sessions[session_id]
        if session.status != "open":
            raise ValueError("The host has ended this collaboration session.")
        return session

    def session_view(self, session_id: str, token: str) -> LiveSessionRecord:
        return self.authorize(session_id, token)[0]

    def change_role(self, session_id: str, participant_id: str, token: str, role: str) -> None:
        session, _ = self.authorize(session_id, token, {"host"})
        participant = session.participants.get(participant_id)
        if not participant or participant.role == "host": raise ValueError("Participant unavailable")
        participant.role = role

    def remove_participant(self, session_id: str, participant_id: str, token: str) -> None:
        session, _ = self.authorize(session_id, token, {"host"})
        participant = session.participants.get(participant_id)
        if not participant or participant.role == "host": raise ValueError("Participant unavailable")
        participant.status = "removed"
        participant.token_hash = None

    def end_session(self, session_id: str, token: str) -> None:
        session, _ = self.authorize(session_id, token, {"host"})
        session.status = "closed"

    def require_live_session(self, document_id: str) -> str:
        """Reject unregistered or expired invitation numbers."""
        now = datetime.now(timezone.utc)
        self._purge_expired_sessions(now)
        if not LIVE_SESSION_PATTERN.fullmatch(document_id):
            raise ValueError("Live session unavailable")
        session = self._live_sessions.get(document_id)
        if not session or session.expires_at <= now or session.status != "open":
            raise ValueError("Live session unavailable")
        return document_id

    def _purge_expired_sessions(self, now: datetime) -> None:
        for session_id, session in list(self._live_sessions.items()):
            if session.expires_at <= now:
                session.status = "expired"
                self._live_sessions.pop(session_id, None)

    async def start(self) -> None:
        if self.persist_updates:
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

    async def connect(self, websocket: WebSocket, document_id: str, token: str) -> None:
        session, participant = self.authorize(document_id, token)
        document_id = session.session_id
        room = await self._get_or_create_room(document_id)
        await websocket.accept()
        adapter = FastAPIWebsocketAdapter(websocket, document_id, participant)
        self._touch(document_id)
        logger.info("Collaboration client connected to room %s", document_id)
        participant.status = "online"
        try:
            await room.serve(adapter)
        finally:
            if participant.status != "removed": participant.status = "offline"
            self._touch(document_id)
            logger.info("Collaboration client left room %s", document_id)
            if self.persist_updates and not room.clients:
                await self.save_room(document_id, force=True)

    async def _get_or_create_room(self, document_id: str) -> YRoom:
        async with self._room_lock:
            existing = self.server.rooms.get(document_id)
            if existing is not None:
                return existing

            ydoc = Doc()
            snapshot = self._snapshot_path(document_id)
            if self.persist_updates and snapshot.is_file():
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
        if not self.persist_updates:
            self._dirty_rooms.pop(document_id, None)
            return
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
