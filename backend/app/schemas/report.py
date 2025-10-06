from datetime import datetime

from pydantic import BaseModel

from app.schemas.athlete import AthleteRead


class MetricResult(BaseModel):
    test_id: int
    test_name: str
    category: str | None
    value: float
    unit: str | None
    recorded_at: datetime | None
    notes: str | None


class SessionReport(BaseModel):
    session_id: int
    session_name: str
    scheduled_at: datetime | None
    location: str | None
    results: list[MetricResult]


class AthleteReport(BaseModel):
    athlete: AthleteRead
    sessions: list[SessionReport]
