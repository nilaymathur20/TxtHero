"""Request validation for case-insensitive text search."""

from pydantic import BaseModel


class SearchPayload(BaseModel):
    """The text fragment a user wants to find."""
    query: str
