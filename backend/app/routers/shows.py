from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies.auth import require_role
from app.models import Show, User
from app.schemas.pagination import Page
from app.schemas.show import ShowCreate, ShowRead, ShowUpdate
from app.services.validation import check_show_publishable

router = APIRouter(prefix="/shows", tags=["shows"])


@router.get("", response_model=Page[ShowRead])
def list_shows(
    q: str | None = None,
    section: str | None = None,
    status_: str | None = None,
    category: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor")),
):
    stmt = select(Show)
    if q:
        stmt = stmt.where(Show.title.ilike(f"%{q}%"))
    if section:
        stmt = stmt.where(Show.section == section)
    if status_:
        stmt = stmt.where(Show.status == status_)
    if category:
        stmt = stmt.where(Show.categories.any(category))

    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()

    return Page(items=rows, total=total or 0, page=page, page_size=page_size)


@router.get("/{show_id}", response_model=ShowRead)
def get_show(
    show_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor")),
):
    show = db.get(Show, show_id)
    if show is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Show not found")
    return show


@router.post("", response_model=ShowRead, status_code=status.HTTP_201_CREATED)
def create_show(
    payload: ShowCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor")),
):
    show = Show(**payload.model_dump())
    if show.status == "published":
        check_show_publishable(show)

    db.add(show)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A show with slug '{payload.slug}' already exists.",
        )
    db.refresh(show)
    return show


@router.patch("/{show_id}", response_model=ShowRead)
def update_show(
    show_id: int,
    payload: ShowUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor")),
):
    show = db.get(Show, show_id)
    if show is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Show not found")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(show, field, value)

    if show.status == "published":
        check_show_publishable(show)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A show with that slug already exists.",
        )
    db.refresh(show)
    return show


@router.delete("/{show_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_show(
    show_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor")),
):
    show = db.get(Show, show_id)
    if show is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Show not found")
    db.delete(show)
    db.commit()
