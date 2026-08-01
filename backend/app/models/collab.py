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
    """A short-lived, high-entropy collaboration invitation."""

    session_id: str
    expires_at: datetime


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
