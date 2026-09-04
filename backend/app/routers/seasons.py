from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies.auth import require_role
from app.models import Season, Show, User
from app.schemas.season import SeasonCreate, SeasonRead

router = APIRouter(tags=["seasons"])


@router.get("/shows/{show_id}/seasons", response_model=list[SeasonRead])
def list_seasons(
    show_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor")),
):
    show = db.get(Show, show_id)
    if show is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Show not found")
    return show.seasons


@router.post("/shows/{show_id}/seasons", response_model=SeasonRead, status_code=status.HTTP_201_CREATED)
def create_season(
    show_id: int,
    payload: SeasonCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor")),
):
    show = db.get(Show, show_id)
    if show is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Show not found")

    season = Season(show_id=show_id, season_number=payload.season_number)
    db.add(season)
    db.commit()
    db.refresh(season)
    return season


@router.delete("/seasons/{season_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_season(
    season_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("editor")),
):
    season = db.get(Season, season_id)
    if season is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    db.delete(season)
    db.commit()
