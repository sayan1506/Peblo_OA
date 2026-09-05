from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, DateTime, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.artwork import artwork_url_map

if TYPE_CHECKING:
    from app.models.artwork import Artwork
    from app.models.season import Season


class Show(Base):
    __tablename__ = "shows"
    __table_args__ = (
        Index("ix_shows_categories", "categories", postgresql_using="gin"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    synopsis: Mapped[str | None] = mapped_column(String, nullable=True)
    section: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    categories: Mapped[list[str]] = mapped_column(ARRAY(String(100)), nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    seasons: Mapped[list["Season"]] = relationship(back_populates="show", cascade="all, delete-orphan")
    artworks: Mapped[list["Artwork"]] = relationship(back_populates="show", cascade="all, delete-orphan")

    @property
    def artwork_map(self) -> dict[str, str]:
        return artwork_url_map(self.artworks)
