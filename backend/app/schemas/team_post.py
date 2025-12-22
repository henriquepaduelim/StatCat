from datetime import datetime

from pydantic import ConfigDict
from sqlmodel import SQLModel


class TeamPostBase(SQLModel):
    content: str
    media_url: str | None = None


class TeamPostCreate(SQLModel):
    content: str


class TeamPostRead(TeamPostBase):
    id: int
    team_id: int
    author_id: int
    author_name: str
    author_role: str
    author_photo_url: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
