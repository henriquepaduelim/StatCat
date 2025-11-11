"""Event models for calendar functionality with notifications."""
import enum
from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import Column, Enum
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .user import User
    from .team import Team


class EventStatus(str, enum.Enum):
    """Status of an event."""
    SCHEDULED = "scheduled"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class ParticipantStatus(str, enum.Enum):
    """Status of event participation."""
    INVITED = "invited"
    CONFIRMED = "confirmed"
    DECLINED = "declined"
    MAYBE = "maybe"


class Event(SQLModel, table=True):
    """Event model for calendar events."""
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=200)
    date: str = Field(max_length=10)  # YYYY-MM-DD
    time: str | None = Field(default=None, max_length=5)  # HH:MM
    location: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None)
    status: EventStatus = Field(default=EventStatus.SCHEDULED, sa_column=Column(Enum(EventStatus)))
    
    # Relations
    team_id: int | None = Field(default=None, foreign_key="team.id", index=True)
    created_by_id: int = Field(foreign_key="user.id", index=True)
    coach_id: int | None = Field(default=None, foreign_key="user.id")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Notification flags
    email_sent: bool = Field(default=False)
    push_sent: bool = Field(default=False)
    
    # Relationships
    participants: List["EventParticipant"] = Relationship(
        back_populates="event",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "passive_deletes": True},
    )
    created_by: "User" = Relationship(sa_relationship_kwargs={"foreign_keys": "[Event.created_by_id]"})


class EventParticipant(SQLModel, table=True):
    """Many-to-many relationship between events and participants (athletes/users)."""
    __tablename__ = "event_participant"
    
    id: int | None = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="event.id", index=True)
    user_id: int | None = Field(default=None, foreign_key="user.id", index=True)
    athlete_id: int | None = Field(default=None, foreign_key="athlete.id", index=True)
    
    status: ParticipantStatus = Field(
        default=ParticipantStatus.INVITED,
        sa_column=Column(Enum(ParticipantStatus))
    )
    
    # Timestamps
    invited_at: datetime = Field(default_factory=datetime.utcnow)
    responded_at: datetime | None = Field(default=None)
    
    # Relationships
    event: Event = Relationship(back_populates="participants")


class Notification(SQLModel, table=True):
    """Notification log for tracking sent notifications."""
    __tablename__ = "notification"
    
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    event_id: int | None = Field(default=None, foreign_key="event.id", index=True)
    
    # Notification type
    type: str = Field(max_length=50)  # 'event_invite', 'event_update', 'event_confirmation', 'event_reminder'
    channel: str = Field(max_length=20)  # 'email', 'push', 'both'
    
    # Content
    title: str = Field(max_length=200)
    body: str
    
    # Status
    sent: bool = Field(default=False)
    sent_at: datetime | None = Field(default=None)
    error: str | None = Field(default=None)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class PushSubscription(SQLModel, table=True):
    """Push notification subscriptions for web push."""
    __tablename__ = "push_subscription"
    
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True, unique=True)
    
    # Web Push subscription data
    endpoint: str
    p256dh: str
    auth: str
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
