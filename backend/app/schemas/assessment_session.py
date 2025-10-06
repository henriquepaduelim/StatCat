from datetime import datetime

from pydantic import ConfigDict
from sqlmodel import SQLModel


class AssessmentSessionBase(SQLModel):
    client_id: int
    name: str
    location: str | None = None
    scheduled_at: datetime | None = None
    notes: str | None = None


class AssessmentSessionCreate(AssessmentSessionBase):
    pass


class AssessmentSessionRead(AssessmentSessionBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
