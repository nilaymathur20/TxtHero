"""Search endpoint that returns line and column locations."""

from fastapi import APIRouter, HTTPException

from app.models.search import SearchPayload
from app.services.search_service import find_matches
from app.state import STATE

router = APIRouter()


@router.post("/search")
def search_text(payload: SearchPayload) -> dict:
    """Find a required query in the current fallback document."""
    if not payload.query:
        raise HTTPException(status_code=400, detail="Query required")
    matches = find_matches(str(STATE["content"]), payload.query)
    return {"query": payload.query, "match_count": len(matches), "matches": matches}
