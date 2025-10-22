from __future__ import annotations

from datetime import datetime

from pydantic import ConfigDict
from sqlmodel import SQLModel


class CalendarEventFilters(SQLModel):
    age_min: int | None = None
    age_max: int | None = None
    genders: list[str] | None = None
    statuses: list[str] | None = None
    teams: list[str] | None = None


class CalendarEventBase(SQLModel):
    summary: str
    description: str | None = None
    location: str | None = None
    event_type: str | None = None
    start_at: datetime
    end_at: datetime
    time_zone: str = "UTC"


class CalendarEventCreate(CalendarEventBase):
    client_id: int | None = None
    calendar_id: str | None = None
    status: str | None = None
    group_ids: list[int] = []
    attendee_ids: list[int] = []
    filters: CalendarEventFilters | None = None


class CalendarEventUpdate(SQLModel):
    summary: str | None = None
    description: str | None = None
    location: str | None = None
    event_type: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    time_zone: str | None = None
    status: str | None = None
    calendar_id: str | None = None
    group_ids: list[int] | None = None
    attendee_ids: list[int] | None = None
    filters: CalendarEventFilters | None = None


class CalendarEventAttendeeRead(SQLModel):
    id: int
    athlete_id: int | None = None
    email: str
    display_name: str | None = None
    status: str
    response_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class CalendarEventRead(CalendarEventBase):
    id: int
    client_id: int
    created_by_id: int
    calendar_id: str
    status: str
    google_event_id: str | None = None
    meeting_url: str | None = None
    color_id: str | None = None
    created_at: datetime
    updated_at: datetime
    attendees: list[CalendarEventAttendeeRead] = []

    model_config = ConfigDict(from_attributes=True)

