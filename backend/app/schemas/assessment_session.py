from datetime import datetime

from pydantic import ConfigDict
from sqlmodel import SQLModel


class AssessmentSessionBase(SQLModel):
    athlete_id: int | None = None
    name: str
    location: str | None = None
    scheduled_at: datetime | None = None
    notes: str | None = None


class AssessmentSessionCreate(AssessmentSessionBase):
    pass


class AssessmentSessionRead(AssessmentSessionBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class AssessmentSessionUpdate(SQLModel):
    name: str | None = None
    location: str | None = None
    scheduled_at: datetime | None = None
    notes: str | None = None
    athlete_id: int | None = None
