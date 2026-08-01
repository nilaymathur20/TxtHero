"""Application configuration and the font catalog used by TxtHero.

Values come from environment variables so the same code works on a laptop,
inside Docker, and in a packaged Electron application.
"""

import os
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field


def _font(name: str, category: str, stack: str, google: bool = False) -> dict[str, Any]:
    """Create one consistently shaped font record for the REST API."""
    family = name.replace(" ", "+")
    return {
        "name": name,
        "category": category,
        "stack": stack,
        "google": google,
        "import_url": f"https://fonts.googleapis.com/css2?family={family}:wght@400;500;600;700&display=swap" if google else None,
    }


SYSTEM_SANS = [
    ("Arial", "Arial, sans-serif"), ("Helvetica", "Helvetica, Arial, sans-serif"),
    ("Segoe UI", "'Segoe UI', Arial, sans-serif"),
]
GOOGLE_SANS = [
    "Roboto", "Open Sans", "Lato", "Montserrat", "Raleway", "Nunito", "Poppins", "Inter",
    "Source Sans 3", "Work Sans", "Outfit", "DM Sans", "Plus Jakarta Sans", "Manrope",
    "Urbanist", "Quicksand", "Comfortaa", "Rubik", "Karla", "Josefin Sans", "Mukta", "Figtree",
]
SYSTEM_SERIF = [
    ("Times New Roman", "'Times New Roman', Times, serif"), ("Georgia", "Georgia, serif"),
    ("Garamond", "Garamond, Georgia, serif"), ("Palatino", "Palatino, 'Palatino Linotype', serif"),
    ("Book Antiqua", "'Book Antiqua', Palatino, serif"),
]
GOOGLE_SERIF = [
    "Libre Baskerville", "Lora", "Merriweather", "Playfair Display", "EB Garamond",
    "Crimson Text", "Cormorant Garamond", "Source Serif 4", "Bitter", "Spectral", "PT Serif",
    "Noto Serif", "DM Serif Display",
]
SYSTEM_MONO = [
    ("Courier New", "'Courier New', monospace"), ("Consolas", "Consolas, monospace"),
    ("Cascadia Code", "'Cascadia Code', Consolas, monospace"),
]
GOOGLE_MONO = [
    "Fira Code", "JetBrains Mono", "Source Code Pro", "Ubuntu Mono", "IBM Plex Mono",
    "Inconsolata", "Anonymous Pro", "Space Mono", "Roboto Mono", "Red Hat Mono",
    "Overpass Mono", "DM Mono",
]
SYSTEM_DISPLAY = [("Impact", "Impact, sans-serif"), ("Comic Sans MS", "'Comic Sans MS', cursive")]
GOOGLE_DISPLAY = ["Lobster", "Righteous", "Bebas Neue", "Oswald"]
GOOGLE_HANDWRITING = [
    "Permanent Marker", "Pacifico", "Satisfy", "Dancing Script", "Caveat", "Indie Flower",
    "Architects Daughter", "Sacramento", "Great Vibes",
]

FONT_CATALOG = {
    "sans-serif": [_font(name, "sans-serif", stack) for name, stack in SYSTEM_SANS]
    + [_font(name, "sans-serif", f"'{name}', sans-serif", True) for name in GOOGLE_SANS],
    "serif": [_font(name, "serif", stack) for name, stack in SYSTEM_SERIF]
    + [_font(name, "serif", f"'{name}', serif", True) for name in GOOGLE_SERIF],
    "monospace": [_font(name, "monospace", stack) for name, stack in SYSTEM_MONO]
    + [_font(name, "monospace", f"'{name}', monospace", True) for name in GOOGLE_MONO],
    "display": [_font(name, "display", stack) for name, stack in SYSTEM_DISPLAY]
    + [_font(name, "display", f"'{name}', sans-serif", True) for name in GOOGLE_DISPLAY],
    "handwriting": [_font(name, "handwriting", f"'{name}', cursive", True) for name in GOOGLE_HANDWRITING],
}


class Settings(BaseModel):
    """Typed application settings with safe local-development defaults."""

    app_name: str = "TxtHero API"
    app_version: str = "1.1.0"
    app_description: str = "Backend API and collaboration server for TxtHero"
    base_dir: Path = Field(default_factory=lambda: Path(__file__).resolve().parent.parent)
    host: str = Field(default_factory=lambda: os.getenv("HOST", "127.0.0.1"))
    port: int = Field(default_factory=lambda: int(os.getenv("PORT", "8000")))
    environment: str = Field(default_factory=lambda: os.getenv("ENV", "development"))
    cors_origins: list[str] = Field(default_factory=lambda: [origin.strip() for origin in os.getenv(
        "CORS_ORIGINS",
        os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
        + ",http://127.0.0.1:3000,http://localhost:3210,http://127.0.0.1:3210",
    ).split(",") if origin.strip()])

    @property
    def storage_dir(self) -> Path:
        """Return the cross-platform directory used for saved documents."""
        return Path(os.getenv("TXTHERO_STORAGE_DIR", self.base_dir / "documents")).expanduser()


settings = Settings()

# Backwards-compatible names used throughout the existing REST application.
APP_NAME = settings.app_name
APP_VERSION = settings.app_version
APP_DESCRIPTION = settings.app_description
BASE_DIR = settings.base_dir
STORAGE_DIR = settings.storage_dir
FRONTEND_ORIGIN = settings.cors_origins[0]


def ensure_storage_dir() -> None:
    """Create the document directory if this is the application's first run."""
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
