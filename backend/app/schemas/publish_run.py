from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PublishRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    triggered_by: int
    started_at: datetime
    finished_at: datetime | None
    outcome: str
    show_count: int
    episode_count: int
    detail: str | None
    has_snapshot: bool
    rolled_back_from_id: int | None
