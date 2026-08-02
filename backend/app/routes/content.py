import json

from fastapi import APIRouter

from app.models.content import ContentPayload
from app.state import STATE

router = APIRouter()


@router.get("/content")
def get_content() -> dict:
    return {"filename": STATE["filename"], "content": STATE["content"]}


@router.post("/content")
def set_content(payload: ContentPayload) -> dict:
    STATE["content"] = payload.content
    serialized = payload.content if isinstance(payload.content, str) else json.dumps(payload.content)
    return {"status": "success", "length": len(serialized)}


@router.post("/clear")
def clear_content() -> dict[str, str]:
    STATE["content"] = ""
    STATE["filename"] = "Untitled"
    return {"status": "success", "message": "Editor cleared"}
