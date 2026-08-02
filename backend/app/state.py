"""Fallback in-memory state for the original, non-collaborative editor."""

from typing import Any


STATE: dict[str, Any] = {
    "content": "",
    "filename": "Untitled",
    "font_family": "Helvetica",
    "font_stack": "Helvetica, Arial, sans-serif",
    "font_size": 14,
    "color": "#332f2b",
    "bold": False,
    "italic": False,
    "underline": False,
}
