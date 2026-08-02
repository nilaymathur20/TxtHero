import os

from fastapi import APIRouter, Header, HTTPException, Request, WebSocket

from app.models.collab import (
    CollabRoom, CollabStats, CreateLiveSession, JoinLiveSession, JoinResult,
    LiveSession, RoleUpdate, RoomPresence, SessionView,
)
from app.services.collab_service import collaboration_manager, validate_document_id

router = APIRouter(tags=["collaboration"])


def _token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="A session credential is required.")
    return authorization[7:]


def _session_view(session, include_pending: bool) -> SessionView:
    return SessionView(
        session_id=session.session_id, session_uuid=session.session_uuid, mode=session.mode,
        require_approval=session.require_approval, expires_at=session.expires_at,
        max_participants=session.max_participants, status=session.status,
        participants=[{
            "participant_id": p.participant_id, "display_name": p.display_name,
            "color": p.color, "role": p.role, "status": p.status,
            "request_id": p.request_id,
        } for p in session.participants.values() if include_pending or p.status != "pending"],
    )


@router.post("/collab/sessions", response_model=LiveSession)
async def create_live_session(payload: CreateLiveSession) -> LiveSession:
    session, token, participant = collaboration_manager.create_live_session(
        payload.host_id, payload.display_name, payload.color, payload.mode,
        payload.require_approval, payload.expires_in_minutes, payload.max_participants,
    )
    return LiveSession(session_id=session.session_id, session_uuid=session.session_uuid,
                       token=token, participant_id=participant.participant_id,
                       expires_at=session.expires_at, require_approval=session.require_approval,
                       mode=session.mode, max_participants=session.max_participants)


@router.post("/collab/sessions/{session_id}/join", response_model=JoinResult)
async def join_live_session(session_id: str, payload: JoinLiveSession, request: Request) -> JoinResult:
    try:
        collaboration_manager.check_join_rate(request.client.host if request.client else "unknown")
        session, participant, token = collaboration_manager.request_join(
            session_id, payload.user_id, payload.display_name, payload.color)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return JoinResult(request_id=participant.request_id, status="pending" if not token else "approved",
                      token=token, participant_id=participant.participant_id if token else None,
                      expires_at=session.expires_at)


@router.get("/collab/join-requests/{request_id}", response_model=JoinResult)
async def get_join_status(request_id: str) -> JoinResult:
    try: session, participant, token = collaboration_manager.join_status(request_id)
    except ValueError as exc: raise HTTPException(status_code=404, detail=str(exc)) from exc
    status = "rejected" if participant.status == "removed" else ("approved" if token else "pending")
    return JoinResult(request_id=request_id, status=status, token=token,
                      participant_id=participant.participant_id if token else None,
                      expires_at=session.expires_at)


@router.get("/collab/sessions/{session_id}", response_model=SessionView)
async def get_live_session(session_id: str, authorization: str | None = Header(default=None)) -> SessionView:
    try:
        session, participant = collaboration_manager.authorize(session_id, _token(authorization))
        return _session_view(session, participant.role == "host")
    except ValueError as exc: raise HTTPException(status_code=403, detail=str(exc)) from exc


@router.post("/collab/sessions/{session_id}/requests/{request_id}/{decision}")
async def decide_join(session_id: str, request_id: str, decision: str,
                      authorization: str | None = Header(default=None)) -> dict:
    if decision not in {"approve", "reject"}: raise HTTPException(status_code=422, detail="Invalid decision")
    try: collaboration_manager.approve(session_id, request_id, _token(authorization), decision == "approve")
    except ValueError as exc: raise HTTPException(status_code=403, detail=str(exc)) from exc
    return {"status": decision + "d"}


@router.patch("/collab/sessions/{session_id}/participants/{participant_id}")
async def change_role(session_id: str, participant_id: str, payload: RoleUpdate,
                      authorization: str | None = Header(default=None)) -> dict:
    try: collaboration_manager.change_role(session_id, participant_id, _token(authorization), payload.role)
    except ValueError as exc: raise HTTPException(status_code=403, detail=str(exc)) from exc
    return {"status": "updated"}


@router.delete("/collab/sessions/{session_id}/participants/{participant_id}")
async def remove_participant(session_id: str, participant_id: str,
                             authorization: str | None = Header(default=None)) -> dict:
    try: collaboration_manager.remove_participant(session_id, participant_id, _token(authorization))
    except ValueError as exc: raise HTTPException(status_code=403, detail=str(exc)) from exc
    return {"status": "removed"}


@router.delete("/collab/sessions/{session_id}")
async def end_live_session(session_id: str, authorization: str | None = Header(default=None)) -> dict:
    try: collaboration_manager.end_session(session_id, _token(authorization))
    except ValueError as exc: raise HTTPException(status_code=403, detail=str(exc)) from exc
    return {"status": "closed"}


@router.websocket("/ws/{document_id}")
async def collaboration_socket(websocket: WebSocket, document_id: str) -> None:
    token = websocket.query_params.get("token", "")
    try:
        collaboration_manager.authorize(document_id, token)
    except ValueError as exc:
        await websocket.close(code=1008, reason=str(exc))
        return
    await collaboration_manager.connect(websocket, document_id, token)


@router.get("/collaboration/{document_id}/users", response_model=RoomPresence)
async def list_active_users(document_id: str, authorization: str | None = Header(default=None)) -> RoomPresence:
    try:
        collaboration_manager.authorize(document_id, _token(authorization))
        users = collaboration_manager.active_users(document_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return RoomPresence(document_id=document_id, count=len(users), users=users)


def _require_diagnostics(authorization: str | None) -> None:
    expected = os.getenv("COLLAB_DIAGNOSTICS_TOKEN")
    if not expected or _token(authorization) != expected:
        raise HTTPException(status_code=404, detail="Resource unavailable")


@router.get("/collab/rooms", response_model=CollabStats)
async def list_rooms(authorization: str | None = Header(default=None)) -> CollabStats:
    """List active in-memory collaboration rooms and their user counts."""
    _require_diagnostics(authorization)
    return CollabStats.model_validate(collaboration_manager.room_stats())


@router.get("/collab/rooms/{document_id}", response_model=CollabRoom)
async def get_room(document_id: str, authorization: str | None = Header(default=None)) -> CollabRoom:
    """Return room metadata and its current awareness users."""
    _require_diagnostics(authorization)
    try:
        room = collaboration_manager.room_info(document_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if room is None:
        raise HTTPException(status_code=404, detail="Resource unavailable")
    return CollabRoom.model_validate(room)
