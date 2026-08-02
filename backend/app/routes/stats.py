"""Writing-statistics endpoint for current solo-editor content."""

from fastapi import APIRouter

from app.services.stats_service import calculate_stats
from app.state import STATE

router = APIRouter()


@router.get("/stats")
def get_stats() -> dict[str, int]:
    """Analyze and return the fallback document's current text."""
    return calculate_stats(str(STATE["content"]))
