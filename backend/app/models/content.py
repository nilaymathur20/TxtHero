"""Request validation for solo editor content, including structured rich text."""

from typing import Any

from pydantic import BaseModel


class ContentPayload(BaseModel):
    """Solo-editor content as plain text, HTML, or TipTap-compatible JSON."""

    content: str | dict[str, Any] | list[Any]
