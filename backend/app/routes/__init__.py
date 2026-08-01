from fastapi import APIRouter

from app.routes import collaboration, content, files, fonts, health, root, search, stats, style

api_router = APIRouter()
for router in (root.router, content.router, stats.router, style.router, files.router, search.router, health.router, fonts.router, collaboration.router):
    api_router.include_router(router)

__all__ = ["api_router"]
