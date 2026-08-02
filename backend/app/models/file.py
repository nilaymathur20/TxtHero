"""Request validation for saving a UTF-8 local document."""

from pydantic import BaseModel


class FilePayload(BaseModel):
    """A filename and its plain-text contents."""
    filename: str
    content: str
