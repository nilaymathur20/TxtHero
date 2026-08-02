from fastapi import APIRouter

from app.config import APP_NAME, APP_VERSION

router = APIRouter()


@router.get("/")
def root() -> dict:
    return {
        "app": APP_NAME,
        "version": APP_VERSION,
        "docs": "http://127.0.0.1:8000/docs",
        "endpoints": {
            "content": "GET/POST /content", "stats": "GET /stats",
            "style": "GET/POST /style", "clear": "POST /clear",
            "files": "GET /files", "save": "POST /files/save",
            "load": "GET /files/load/{filename}", "delete": "DELETE /files/{filename}",
            "search": "POST /search", "health": "GET /health",
            "collaboration": "WS /ws/{document_id}",
            "active_users": "GET /collaboration/{document_id}/users",
            "rooms": "GET /collab/rooms", "fonts": "GET /fonts",
        },
    }
