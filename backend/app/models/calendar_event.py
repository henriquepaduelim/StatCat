from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


class CalendarEvent(SQLModel, table=True):
    __tablename__ = "calendar_event"
    id: int | None = Field(default=None, primary_key=True)
    client_id: int = Field(foreign_key="client.id", index=True)
    created_by_id: int = Field(foreign_key="user.id", index=True)
    calendar_id: str = Field(default="primary")
    summary: str = Field(index=True)
    description: str | None = None
    location: str | None = None
    event_type: str | None = Field(default=None, index=True)
    status: str = Field(default="scheduled", index=True)
    start_at: datetime = Field(index=True)
    end_at: datetime = Field(index=True)
    time_zone: str = Field(default="UTC")
    google_event_id: str | None = Field(default=None, unique=True, index=True)
    meeting_url: str | None = None
    color_id: str | None = None
    selection_metadata: dict | None = Field(
        default=None, sa_column=Column(JSON, nullable=True)
    )
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )


class CalendarEventAttendee(SQLModel, table=True):
    __tablename__ = "calendar_event_attendee"
    id: int | None = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="calendar_event.id", index=True)
    athlete_id: int | None = Field(default=None, foreign_key="athlete.id", index=True)
    email: str = Field(index=True)
    display_name: str | None = None
    invited_via: str = Field(default="google", index=True)
    status: str = Field(default="pending", index=True)
    response_at: datetime | None = Field(default=None, index=True)
    response_source: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )
