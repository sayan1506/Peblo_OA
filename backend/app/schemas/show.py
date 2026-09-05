from pydantic import BaseModel, ConfigDict, Field


class ShowBase(BaseModel):
    title: str
    slug: str
    synopsis: str | None = None
    section: str | None = None
    categories: list[str] = []


class ShowCreate(ShowBase):
    status: str = "draft"


class ShowUpdate(BaseModel):
    title: str | None = None
    synopsis: str | None = None
    section: str | None = None
    categories: list[str] | None = None
    status: str | None = None


class ShowRead(ShowBase):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    status: str
    artwork: dict[str, str] = Field(validation_alias="artwork_map")
