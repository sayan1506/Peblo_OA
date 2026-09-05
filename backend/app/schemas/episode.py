from pydantic import BaseModel, ConfigDict, Field


class EpisodeCreate(BaseModel):
    episode_number: int
    title: str
    content_group: str
    language: str
    duration_seconds: int | None = None
    status: str = "draft"


class EpisodeUpdate(BaseModel):
    episode_number: int | None = None
    title: str | None = None
    content_group: str | None = None
    language: str | None = None
    duration_seconds: int | None = None
    status: str | None = None


class EpisodeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    season_id: int
    episode_number: int
    title: str
    content_group: str
    language: str
    duration_seconds: int | None
    status: str
    artwork: dict[str, str] = Field(validation_alias="artwork_map")
