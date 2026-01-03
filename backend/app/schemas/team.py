from __future__ import annotations

from datetime import datetime

from pydantic import ConfigDict, EmailStr
from sqlmodel import SQLModel


class TeamBase(SQLModel):
    name: str
    age_category: str
    description: str | None = None
    model_config = ConfigDict(extra="ignore")


class TeamCreate(TeamBase):
    pass


class TeamRead(TeamBase):
    id: int
    created_by_id: int | None
    created_at: datetime
    updated_at: datetime
    athlete_count: int
    coach_user_id: int | None = None
    coach_full_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class TeamCoachCreate(SQLModel):
    full_name: str
    email: EmailStr
    password: str | None = None
    phone: str | None = None
