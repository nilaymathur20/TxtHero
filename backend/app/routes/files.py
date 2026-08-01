from fastapi import APIRouter

from app.models.file import FilePayload
from app.services.file_service import delete_document, list_documents, load_document, save_document
from app.state import STATE

router = APIRouter(prefix="/files")


@router.get("")
def list_files() -> dict:
    files = list_documents()
    return {"count": len(files), "files": files}


@router.post("/save")
def save_file(payload: FilePayload) -> dict:
    filename, path = save_document(payload.filename, payload.content)
    STATE.update(filename=filename, content=payload.content)
    return {"status": "success", "filename": filename, "path": str(path.resolve()), "size": len(payload.content)}


@router.get("/load/{filename}")
def load_file(filename: str) -> dict:
    safe_name, content = load_document(filename)
    STATE.update(filename=safe_name, content=content)
    return {"status": "success", "filename": safe_name, "content": content}


@router.delete("/{filename}")
def delete_file(filename: str) -> dict[str, str]:
    return {"status": "success", "deleted": delete_document(filename)}
