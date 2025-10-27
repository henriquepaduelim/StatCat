from __future__ import annotations

from datetime import datetime

from pydantic import ConfigDict, EmailStr
from sqlmodel import SQLModel


class TeamBase(SQLModel):
    name: str
    age_category: str
    description: str | None = None
    coach_name: str | None = None


class TeamCreate(TeamBase):
    pass


class TeamRead(TeamBase):
    id: int
    created_by_id: int | None
    created_at: datetime
    updated_at: datetime
    athlete_count: int

    model_config = ConfigDict(from_attributes=True)


class TeamCoachCreate(SQLModel):
    full_name: str
    email: EmailStr
    password: str
    phone: str | None = None
