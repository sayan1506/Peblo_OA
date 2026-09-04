import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies.auth import require_role
from app.models import PublishRun, User
from app.services.catalog import build_catalog
from app.storage import get_storage

router = APIRouter(prefix="/admin", tags=["admin"])

CATALOG_KEY = "catalog.json"


@router.post("/catalog/publish", status_code=status.HTTP_200_OK)
def publish_catalog(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    run = PublishRun(
        triggered_by=user.id,
        started_at=datetime.now(timezone.utc),
        outcome="running",
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        catalog, show_count, episode_count = build_catalog(db)
        storage = get_storage()
        storage.put(CATALOG_KEY, json.dumps(catalog, indent=2).encode("utf-8"), "application/json")
    except Exception as e:
        run.outcome = "failed"
        run.detail = str(e)
        run.finished_at = datetime.now(timezone.utc)
        db.commit()
        raise

    run.outcome = "published"
    run.show_count = show_count
    run.episode_count = episode_count
    run.finished_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "run_id": run.id,
        "outcome": run.outcome,
        "show_count": run.show_count,
        "episode_count": run.episode_count,
    }
