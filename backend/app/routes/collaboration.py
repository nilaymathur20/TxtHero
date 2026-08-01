from fastapi import APIRouter, HTTPException, WebSocket

from app.models.collab import CollabRoom, CollabStats, LiveSession, RoomPresence
from app.services.collab_service import collaboration_manager, validate_document_id

router = APIRouter(tags=["collaboration"])


@router.post("/collab/sessions", response_model=LiveSession)
async def create_live_session() -> LiveSession:
    """Issue a fresh 15-digit, one-hour collaboration invitation."""
    session_id, expires_at = collaboration_manager.create_live_session()
    return LiveSession(session_id=session_id, expires_at=expires_at)


@router.websocket("/ws/{document_id}")
async def collaboration_socket(websocket: WebSocket, document_id: str) -> None:
    try:
        collaboration_manager.require_live_session(document_id)
    except ValueError as exc:
        await websocket.close(code=1008, reason=str(exc))
        return
    await collaboration_manager.connect(websocket, document_id)


@router.get("/collaboration/{document_id}/users", response_model=RoomPresence)
async def list_active_users(document_id: str) -> RoomPresence:
    try:
        users = collaboration_manager.active_users(document_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return RoomPresence(document_id=document_id, count=len(users), users=users)


@router.get("/collab/rooms", response_model=CollabStats)
async def list_rooms() -> CollabStats:
    """List active in-memory collaboration rooms and their user counts."""
    return CollabStats.model_validate(collaboration_manager.room_stats())


@router.get("/collab/rooms/{document_id}", response_model=CollabRoom)
async def get_room(document_id: str) -> CollabRoom:
    """Return room metadata and its current awareness users."""
    try:
        room = collaboration_manager.room_info(document_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if room is None:
        raise HTTPException(status_code=404, detail="Resource unavailable")
    return CollabRoom.model_validate(room)
