import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies.auth import require_role
from app.models import Artwork, Episode, Show, User
from app.services.artwork_validation import ArtworkValidationError, validate_artwork
from app.storage import get_storage

router = APIRouter(prefix="/artwork", tags=["artwork"])


@router.post("", status_code=status.HTTP_201_CREATED)
def upload_artwork(
    kind: str,
    show_id: int | None = None,
    episode_id: int | None = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor")),
):
    if not show_id and not episode_id:
        raise HTTPException(status_code=400, detail="Provide either show_id or episode_id.")
    if show_id and episode_id:
        raise HTTPException(status_code=400, detail="Provide only one of show_id or episode_id, not both.")

    target = db.get(Show, show_id) if show_id else db.get(Episode, episode_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Show or episode not found.")

    data = file.file.read()
    try:
        width, height = validate_artwork(kind, data)
    except ArtworkValidationError as e:
        raise HTTPException(status_code=422, detail=e.message)

    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    key = f"artwork/{kind}/{uuid.uuid4()}.{ext}"
    storage = get_storage()
    url = storage.put(key, data, file.content_type or "application/octet-stream")

    artwork = Artwork(
        show_id=show_id,
        episode_id=episode_id,
        kind=kind,
        storage_key=key,
        width=width,
        height=height,
        size_bytes=len(data),
    )
    db.add(artwork)
    db.commit()
    db.refresh(artwork)
    return {
        "id": artwork.id,
        "kind": artwork.kind,
        "width": artwork.width,
        "height": artwork.height,
        "url": url,
    }
