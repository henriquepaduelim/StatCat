"""Schemas for Event API endpoints."""
from datetime import date, datetime, time
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class EventParticipantResponse(BaseModel):
    """Response model for event participant."""
    id: int
    user_id: Optional[int] = None  # None for athletes without user accounts
    athlete_id: Optional[int] = None
    status: str  # invited, confirmed, declined, maybe
    invited_at: datetime
    responded_at: Optional[datetime] = None


class EventCreate(BaseModel):
    """Schema for creating an event."""
    name: str = Field(..., max_length=200)
    event_date: date
    start_time: Optional[str] = None
    location: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None
    team_id: Optional[int] = None
    team_ids: List[int] = Field(default_factory=list)
    coach_id: Optional[int] = None
    invitee_ids: List[int] = Field(default_factory=list)  # List of user IDs to invite (coaches, etc.)
    athlete_ids: List[int] = Field(default_factory=list)  # List of athlete IDs to invite
    send_email: bool = Field(default=True)
    send_push: bool = Field(default=True)

    @field_validator("event_date", mode="before")
    @classmethod
    def _normalize_date(cls, value):
        if value is None or value == "":
            return value
        if isinstance(value, date):
            return value
        if isinstance(value, str):
            try:
                return datetime.strptime(value, "%Y-%m-%d").date()
            except ValueError:
                pass
        raise ValueError("Invalid date format. Use YYYY-MM-DD.")

    @field_validator("start_time", mode="before")
    @classmethod
    def _normalize_time(cls, value):
        if value is None or value == "":
            return None
        if isinstance(value, str):
            v = value.strip()
            if v == "":
                return None
            return v
        raise ValueError("Invalid time format. Use HH:MM or HH:MM:SS.")


class EventUpdate(BaseModel):
    """Schema for updating an event."""
    name: Optional[str] = Field(None, max_length=200)
    event_date: Optional[date] = None
    start_time: Optional[str] = None
    location: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None
    status: Optional[str] = None  # scheduled, cancelled, completed
    team_id: Optional[int] = None
    team_ids: Optional[List[int]] = None
    coach_id: Optional[int] = None
    send_notification: bool = Field(default=True)

    @field_validator("event_date", mode="before")
    @classmethod
    def _normalize_date(cls, value):
        if value is None or value == "":
            return None
        if isinstance(value, date):
            return value
        if isinstance(value, str):
            try:
                return datetime.strptime(value, "%Y-%m-%d").date()
            except ValueError:
                pass
        raise ValueError("Invalid date format. Use YYYY-MM-DD.")

    @field_validator("start_time", mode="before")
    @classmethod
    def _normalize_time(cls, value):
        if value is None or value == "":
            return None
        if isinstance(value, str):
            v = value.strip()
            if v == "":
                return None
            return v
        raise ValueError("Invalid time format. Use HH:MM or HH:MM:SS.")


class EventResponse(BaseModel):
    """Response model for event."""
    id: int
    name: str
    event_date: date
    start_time: Optional[time] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    status: str
    team_id: Optional[int] = None
    team_ids: List[int] = Field(default_factory=list)
    created_by_id: int
    coach_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    email_sent: bool
    push_sent: bool
    participants: List[EventParticipantResponse] = []

    class Config:
        from_attributes = True


class EventConfirmation(BaseModel):
    """Schema for confirming/declining event attendance."""
    status: str = Field(..., pattern=r'^(confirmed|declined|maybe)$')


class EventParticipantsAdd(BaseModel):
    """Schema used when adding manual participants to an event."""

    user_ids: List[int] = Field(default_factory=list)
    athlete_ids: List[int] = Field(default_factory=list)
    send_notification: bool = True


class PushSubscriptionCreate(BaseModel):
    """Schema for creating a push subscription."""
    endpoint: str
    p256dh: str
    auth: str


class NotificationPreferences(BaseModel):
    """User notification preferences."""
    event_invites: bool = True
    event_updates: bool = True
    event_confirmations: bool = True
    event_reminders: bool = True
    channel: str = Field(default="both", pattern=r'^(email|push|both)$')
