"""Optional formatting fields accepted by the solo editor style endpoint."""

from pydantic import BaseModel, Field


class StylePayload(BaseModel):
    """A partial style update; omitted values remain unchanged."""
    font_family: str | None = None
    font_stack: str | None = Field(default=None, max_length=200)
    font_size: int | None = Field(default=None, gt=0)
    color: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    bold: bool | None = None
    italic: bool | None = None
    underline: bool | None = None
