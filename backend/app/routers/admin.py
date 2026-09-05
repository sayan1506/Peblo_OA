import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies.auth import require_role
from app.models import PublishRun, User
from app.schemas.pagination import Page
from app.schemas.publish_run import PublishRunRead
from app.services.catalog import build_catalog
from app.services.catalog_diff import count_catalog, diff_catalogs
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
    run.catalog_snapshot = catalog
    run.finished_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "run_id": run.id,
        "outcome": run.outcome,
        "show_count": run.show_count,
        "episode_count": run.episode_count,
    }


@router.post("/catalog/rollback/{run_id}", status_code=status.HTTP_200_OK)
def rollback_catalog(
    run_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    target = db.get(PublishRun, run_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publish run not found")
    if target.catalog_snapshot is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This run has no stored catalog snapshot to roll back to",
        )

    snapshot = target.catalog_snapshot

    run = PublishRun(
        triggered_by=user.id,
        started_at=datetime.now(timezone.utc),
        outcome="running",
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        storage = get_storage()
        storage.put(CATALOG_KEY, json.dumps(snapshot).encode("utf-8"), "application/json")
    except Exception as e:
        run.outcome = "failed"
        run.detail = str(e)
        run.finished_at = datetime.now(timezone.utc)
        db.commit()
        raise

    show_count, episode_count = count_catalog(snapshot)

    run.outcome = "rolled_back"
    run.show_count = show_count
    run.episode_count = episode_count
    run.catalog_snapshot = snapshot
    run.rolled_back_from_id = target.id
    run.detail = f"Rolled back to run #{target.id}"
    run.finished_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "run_id": run.id,
        "outcome": run.outcome,
        "show_count": run.show_count,
        "episode_count": run.episode_count,
        "rolled_back_from_id": run.rolled_back_from_id,
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
