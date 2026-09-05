from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.episode import Episode
    from app.models.show import Show


class Artwork(Base):
    __tablename__ = "artworks"

    id: Mapped[int] = mapped_column(primary_key=True)
    show_id: Mapped[int | None] = mapped_column(ForeignKey("shows.id"), nullable=True, index=True)
    episode_id: Mapped[int | None] = mapped_column(ForeignKey("episodes.id"), nullable=True, index=True)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)  # poster | banner | thumbnail
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)

    show: Mapped["Show"] = relationship(back_populates="artworks")
    episode: Mapped["Episode"] = relationship(back_populates="artworks")


def artwork_url_map(artworks: list["Artwork"]) -> dict[str, str]:
    """Latest-uploaded artwork per kind, keyed by kind, as `/static/...` URLs."""
    by_kind: dict[str, Artwork] = {}
    for art in artworks:
        if art.kind not in by_kind or art.id > by_kind[art.kind].id:
            by_kind[art.kind] = art
    return {kind: f"/static/{art.storage_key}" for kind, art in by_kind.items()}
