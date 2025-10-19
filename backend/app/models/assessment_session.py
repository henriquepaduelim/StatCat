from datetime import datetime

from sqlmodel import Field, SQLModel


class AssessmentSession(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    client_id: int = Field(foreign_key="client.id")
    athlete_id: int | None = Field(default=None, foreign_key="athlete.id")
    name: str
    location: str | None = None
    scheduled_at: datetime | None = None
    notes: str | None = None
