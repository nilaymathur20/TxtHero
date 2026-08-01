from fastapi import APIRouter

from app.models.style import StylePayload
from app.state import STATE

router = APIRouter()
STYLE_KEYS = ("font_family", "font_stack", "font_size", "color", "bold", "italic", "underline")


@router.get("/style")
def get_style() -> dict:
    return {key: STATE[key] for key in STYLE_KEYS}


@router.post("/style")
def set_style(payload: StylePayload) -> dict:
    updates = payload.model_dump(exclude_none=True)
    STATE.update(updates)
    return {"status": "success", "style": get_style()}
