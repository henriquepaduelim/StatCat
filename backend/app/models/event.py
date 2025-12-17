from datetime import date, datetime, time, timezone
from enum import Enum
from typing import TYPE_CHECKING, List, Optional, Iterable

import sqlalchemy as sa
from pydantic import PrivateAttr
from sqlmodel import Field, Relationship, SQLModel

from app.db.types import SafeDate, SafeTime

if TYPE_CHECKING:
    from .user import User
    from .event_team_link import EventTeamLink
    from .event_participant import EventParticipant


class EventStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class Event(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(sa_column=sa.Column(sa.String(length=200), nullable=False))
    event_date: date = Field(sa_column=sa.Column(SafeDate(), nullable=False))
    start_time: Optional[time] = Field(default=None, sa_column=sa.Column(SafeTime(), nullable=True))
    location: Optional[str] = Field(default=None, sa_column=sa.Column(sa.String(length=500)))
    notes: Optional[str] = None
    status: Optional[EventStatus] = Field(
        default=EventStatus.SCHEDULED,
        sa_column=sa.Column(
            sa.Enum(EventStatus, name="eventstatus", values_callable=lambda e: [item.value for item in e]),
            nullable=True,
        ),
    )
    team_id: Optional[int] = Field(default=None, foreign_key="team.id", index=True)
    coach_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    created_by_id: int = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True, nullable=False)
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"onupdate": datetime.now(timezone.utc)},
        nullable=False,
    )
    email_sent: bool = Field(default=False, nullable=False)
    push_sent: bool = Field(default=False, nullable=False)

    created_by: "User" = Relationship(
        back_populates="created_events",
        sa_relationship_kwargs={"foreign_keys": "Event.created_by_id"},
    )
    coach: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "Event.coach_id"})
    teams: List["EventTeamLink"] = Relationship(back_populates="event")
    participants: List["EventParticipant"] = Relationship(back_populates="event")

    # Cached, non-persistent team ids for serialization
    _team_ids: List[int] = PrivateAttr(default_factory=list)

    @property
    def team_ids(self) -> List[int]:
        return list(self._team_ids)

    def set_team_ids(self, team_ids: Iterable[int] | None) -> None:
        self._team_ids = list(team_ids or [])


class Notification(SQLModel, table=True):
    __tablename__ = "notification"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    event_id: Optional[int] = Field(default=None, foreign_key="event.id", index=True)
    type: str
    channel: str
    title: str
    body: str
    sent: bool = Field(default=False)
    sent_at: Optional[datetime] = None
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True, nullable=False)
    read: bool = Field(default=False)


class PushSubscription(SQLModel, table=True):
    __tablename__ = "push_subscription"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True, nullable=False)
    endpoint: str
    p256dh: str
    auth: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"onupdate": datetime.now(timezone.utc)},
        nullable=False,
    )
