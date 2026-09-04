from pydantic import BaseModel, ConfigDict


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
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
