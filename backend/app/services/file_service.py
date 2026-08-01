"""Safe cross-platform UTF-8 document listing, loading, saving, and deletion."""

from pathlib import Path

from fastapi import HTTPException

from app.config import STORAGE_DIR


def _file_path(filename: str) -> Path:
    """Resolve a basename inside storage and reject blank or special names."""
    safe_name = Path(filename).name
    if not filename.strip() or safe_name in {"", ".", ".."}:
        raise HTTPException(status_code=400, detail="Filename required")
    return STORAGE_DIR / safe_name


def list_documents() -> list[dict[str, str | int | float]]:
    """Return metadata for every regular file in the document directory."""
    files = []
    for path in STORAGE_DIR.iterdir():
        if path.is_file():
            stat = path.stat()
            files.append({"filename": path.name, "size": stat.st_size, "modified": stat.st_mtime})
    return sorted(files, key=lambda item: str(item["filename"]).lower())


def save_document(filename: str, content: str) -> tuple[str, Path]:
    """Write UTF-8 ``content`` and return the safe name and resulting path."""
    path = _file_path(filename)
    path.write_text(content, encoding="utf-8")
    return path.name, path


def load_document(filename: str) -> tuple[str, str]:
    """Read an existing UTF-8 document or raise a typed 404 error."""
    path = _file_path(filename)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Resource unavailable")
    return path.name, path.read_text(encoding="utf-8")


def delete_document(filename: str) -> str:
    """Delete an existing local document and return its safe basename."""
    path = _file_path(filename)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Resource unavailable")
    path.unlink()
    return path.name
