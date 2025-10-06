from datetime import datetime

from sqlmodel import Field, SQLModel


class SessionResult(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="assessmentsession.id")
    athlete_id: int = Field(foreign_key="athlete.id")
    test_id: int = Field(foreign_key="testdefinition.id")
    value: float
    unit: str | None = None
    recorded_at: datetime = Field(default_factory=datetime.utcnow)
    notes: str | None = None
