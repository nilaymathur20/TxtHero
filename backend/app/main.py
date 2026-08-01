"""Create the FastAPI app, middleware, routes, and collaboration lifecycle."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import APP_DESCRIPTION, APP_NAME, APP_VERSION, ensure_storage_dir, settings
from app.routes import api_router
from app.services.collab_service import collaboration_manager


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Start room services at boot and save/stop them during graceful shutdown."""
    ensure_storage_dir()
    await collaboration_manager.start()
    try:
        yield
    finally:
        await collaboration_manager.stop()


app = FastAPI(title=APP_NAME, description=APP_DESCRIPTION, version=APP_VERSION, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)
