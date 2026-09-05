from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.dependencies.auth import require_role
from app.models import Episode, Season, Show, User
from app.schemas.episode import EpisodeCreate, EpisodeRead, EpisodeUpdate
from app.schemas.pagination import Page
from app.services.audit import record_audit_log
from app.services.validation import check_episode_publishable

router = APIRouter(tags=["episodes"])


@router.get("/episodes", response_model=Page[EpisodeRead])
def list_episodes(
    q: str | None = None,
    language: str | None = None,
    status_: str | None = None,
    section: str | None = None,
    show_id: int | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor")),
):
    stmt = select(Episode).join(Season).join(Show).options(selectinload(Episode.artworks))
    if q:
        stmt = stmt.where(Episode.title.ilike(f"%{q}%"))
    if language:
        stmt = stmt.where(Episode.language == language)
    if status_:
        stmt = stmt.where(Episode.status == status_)
    if section:
        stmt = stmt.where(Show.section == section)
    if show_id:
        stmt = stmt.where(Season.show_id == show_id)

    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()

    return Page(items=rows, total=total or 0, page=page, page_size=page_size)


@router.get("/episodes/{episode_id}", response_model=EpisodeRead)
def get_episode(
    episode_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor")),
):
    episode = db.get(Episode, episode_id, options=[selectinload(Episode.artworks)])
    if episode is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode not found")
    return episode


@router.post(
    "/shows/{show_id}/seasons/{season_id}/episodes",
    response_model=EpisodeRead,
    status_code=status.HTTP_201_CREATED,
)
def create_episode(
    show_id: int,
    season_id: int,
    payload: EpisodeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor")),
):
    season = db.get(Season, season_id)
    if season is None or season.show_id != show_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")

    episode = Episode(season_id=season_id, **payload.model_dump())
    db.add(episode)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"An episode with content_group='{payload.content_group}' and "
                f"language='{payload.language}' already exists."
            ),
        )

    if episode.status == "published":
        check_episode_publishable(episode)

    record_audit_log(db, user, "created", "episode", episode.id, f"created episode '{episode.title}'")
    db.commit()
    db.refresh(episode)
    return episode


@router.patch("/episodes/{episode_id}", response_model=EpisodeRead)
def update_episode(
    episode_id: int,
    payload: EpisodeUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor")),
):
    episode = db.get(Episode, episode_id)
    if episode is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode not found")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(episode, field, value)

    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An episode with that content_group and language already exists.",
        )

    if episode.status == "published":
        check_episode_publishable(episode)

    if updates:
        record_audit_log(
            db, user, "updated", "episode", episode.id,
            f"updated episode '{episode.title}' ({', '.join(updates.keys())})",
        )
    db.commit()
    db.refresh(episode)
    return episode


@router.delete("/episodes/{episode_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_episode(
    episode_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor")),
):
    episode = db.get(Episode, episode_id)
    if episode is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode not found")
    title = episode.title
    db.delete(episode)
    record_audit_log(db, user, "deleted", "episode", episode_id, f"deleted episode '{title}'")
    db.commit()
