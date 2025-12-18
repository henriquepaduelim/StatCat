from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .event import Event
    from .athlete import Athlete
    from .user import User


class ParticipantStatus(str, Enum):
    INVITED = "INVITED"
    CONFIRMED = "CONFIRMED"
    DECLINED = "DECLINED"
    MAYBE = "MAYBE"


class EventParticipant(SQLModel, table=True):
    __tablename__ = "event_participant"

    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="event.id", index=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    athlete_id: Optional[int] = Field(
        default=None, foreign_key="athlete.id", index=True
    )
    status: Optional[ParticipantStatus] = Field(default=None)
    invited_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    responded_at: Optional[datetime] = None

    event: "Event" = Relationship(back_populates="participants")
    athlete: Optional["Athlete"] = Relationship(back_populates="event_participations")
    user: Optional["User"] = Relationship()
