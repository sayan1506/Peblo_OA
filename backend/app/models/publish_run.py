from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.user import User


class PublishRun(Base):
    __tablename__ = "publish_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    triggered_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    outcome: Mapped[str] = mapped_column(String(20), nullable=False, default="running")
    show_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    episode_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    detail: Mapped[str | None] = mapped_column(String(500), nullable=True)
    catalog_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    rolled_back_from_id: Mapped[int | None] = mapped_column(
        ForeignKey("publish_runs.id"), nullable=True
    )

    user: Mapped["User"] = relationship(back_populates="publish_runs")

    @property
    def has_snapshot(self) -> bool:
        return self.catalog_snapshot is not None
