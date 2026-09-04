from pydantic import BaseModel, ConfigDict


class SeasonCreate(BaseModel):
    season_number: int


class SeasonRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    show_id: int
    season_number: int
