"""Small health endpoint used by Docker and connection latency checks."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    """Confirm that FastAPI is accepting requests."""
    return {"status": "healthy"}
