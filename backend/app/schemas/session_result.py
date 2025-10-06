from datetime import datetime

from pydantic import ConfigDict
from sqlmodel import SQLModel


class SessionResultBase(SQLModel):
    session_id: int | None = None
    athlete_id: int
    test_id: int
    value: float
    unit: str | None = None
    recorded_at: datetime | None = None
    notes: str | None = None


class SessionResultCreate(SessionResultBase):
    pass


class SessionResultRead(SessionResultBase):
    id: int
    session_id: int

    model_config = ConfigDict(from_attributes=True)
