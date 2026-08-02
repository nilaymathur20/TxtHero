"""Pydantic response models for collaboration presence and room diagnostics."""

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field


class CollabUser(BaseModel):
    """A guest currently known to a room through Yjs awareness."""

    user_id: str
    display_name: str
    color: str
    client_id: int | None = None
    cursor_position: Any | None = None
    selection: Any | None = None


class CollabRoom(BaseModel):
    """Public diagnostic information about one collaborative document."""

    document_id: str
    users: list[CollabUser] = Field(default_factory=list)
    created_at: datetime
    last_activity: datetime


class CollabMessage(BaseModel):
    """JSON event model available to future non-Yjs integrations and logs."""

    type: Literal["join", "leave", "update", "cursor", "selection"]
    user: CollabUser | None = None
    data: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CollabStats(BaseModel):
    """Aggregate counts returned by ``GET /collab/rooms``."""

    room_count: int
    total_users: int
    per_room_user_count: dict[str, int]
    rooms: list[CollabRoom]


class LiveSession(BaseModel):
    """A short-lived collaboration invitation and host credential."""

    session_id: str
    session_uuid: str
    token: str
    participant_id: str
    expires_at: datetime
    require_approval: bool
    mode: Literal["1:1", "team"]
    max_participants: int


class CreateLiveSession(BaseModel):
    host_id: str = Field(min_length=1, max_length=128)
    display_name: str = Field(min_length=1, max_length=60)
    color: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    mode: Literal["1:1", "team"] = "team"
    require_approval: bool = True
    expires_in_minutes: int = Field(default=120, ge=15, le=480)
    max_participants: int = Field(default=10, ge=2, le=15)


class JoinLiveSession(BaseModel):
    user_id: str = Field(min_length=1, max_length=128)
    display_name: str = Field(min_length=1, max_length=60)
    color: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")


class JoinResult(BaseModel):
    request_id: str
    status: Literal["pending", "approved", "rejected"]
    token: str | None = None
    participant_id: str | None = None
    expires_at: datetime


class ParticipantView(BaseModel):
    participant_id: str
    display_name: str
    color: str
    role: Literal["host", "editor", "viewer"]
    status: Literal["pending", "online", "offline", "removed"]
    request_id: str | None = None


class SessionView(BaseModel):
    session_id: str
    session_uuid: str
    mode: Literal["1:1", "team"]
    require_approval: bool
    expires_at: datetime
    max_participants: int
    status: Literal["open", "closed", "expired"]
    participants: list[ParticipantView]


class RoleUpdate(BaseModel):
    role: Literal["editor", "viewer"]


# Compatibility aliases for the first collaboration API version.
class ActiveUser(BaseModel):
    """Legacy active-user shape retained for existing API clients."""

    id: str
    name: str
    color: str
    client_id: int


class RoomPresence(BaseModel):
    """Legacy room-presence response retained for existing API clients."""

    document_id: str
    count: int = Field(ge=0)
    users: list[ActiveUser]
