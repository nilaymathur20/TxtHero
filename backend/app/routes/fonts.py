"""REST endpoints for browsing and searching TxtHero's lazy-loaded fonts."""

from fastapi import APIRouter, HTTPException

from app.config import FONT_CATALOG

router = APIRouter(prefix="/fonts", tags=["fonts"])


@router.get("")
def list_fonts() -> dict:
    """Return every font grouped by category for the frontend selector."""
    return {"categories": FONT_CATALOG, "count": sum(map(len, FONT_CATALOG.values()))}


@router.get("/search/{query}")
def search_fonts(query: str) -> dict:
    """Find fonts whose names contain ``query``, ignoring letter case."""
    term = query.strip().lower()
    matches = [font for fonts in FONT_CATALOG.values() for font in fonts if term in font["name"].lower()]
    return {"query": query, "count": len(matches), "fonts": matches}


@router.get("/{category}")
def fonts_by_category(category: str) -> dict:
    """Return one font category or a clear 404 error for unknown categories."""
    normalized = category.lower()
    if normalized not in FONT_CATALOG:
        raise HTTPException(status_code=404, detail=f"Unknown font category: {category}")
    return {"category": normalized, "count": len(FONT_CATALOG[normalized]), "fonts": FONT_CATALOG[normalized]}
