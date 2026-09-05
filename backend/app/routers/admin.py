import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies.auth import require_role
from app.models import PublishRun, User
from app.schemas.pagination import Page
from app.schemas.publish_run import PublishRunRead
from app.services.catalog import build_catalog
from app.services.catalog_diff import diff_catalogs
from app.services.validation_report import build_validation_report
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


@router.get("/catalog/dry-run")
def dry_run_catalog(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor")),
):
    """Builds the catalog that a real publish would write, without writing
    it, and diffs it against whatever is currently published (if anything)."""
    new_catalog, show_count, episode_count = build_catalog(db)

    storage = get_storage()
    try:
        current_catalog = json.loads(storage.get(CATALOG_KEY))
    except FileNotFoundError:
        current_catalog = None

    return {
        "show_count": show_count,
        "episode_count": episode_count,
        "diff": diff_catalogs(current_catalog, new_catalog),
    }


@router.get("/validation-report")
def get_validation_report(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor")),
):
    return build_validation_report(db)


@router.get("/publish-runs", response_model=Page[PublishRunRead])
def list_publish_runs(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor")),
):
    stmt = select(PublishRun).order_by(PublishRun.started_at.desc())
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    return Page(items=rows, total=total or 0, page=page, page_size=page_size)
