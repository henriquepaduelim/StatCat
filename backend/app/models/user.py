from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, List, Optional

import sqlalchemy as sa
from sqlmodel import Field, Relationship, SQLModel

from app.models.team import CoachTeamLink

if TYPE_CHECKING:
    from .athlete import Athlete
    from .event import Event
    from .team import Team


class UserRole(str, Enum):
    ATHLETE = "ATHLETE"
    COACH = "COACH"
    STAFF = "STAFF"
    ADMIN = "ADMIN"


class UserAthleteApprovalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    INCOMPLETE = "INCOMPLETE"


class User(SQLModel, table=True):
    __tablename__ = "user"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    full_name: str
    phone: Optional[str] = None
    photo_url: Optional[str] = None
    role: Optional[UserRole] = Field(
        default=UserRole.ATHLETE,
        sa_column=sa.Column(
            sa.Enum(UserRole, name="userrole", values_callable=lambda e: [item.value for item in e]),
            nullable=True,
        ),
    )
    athlete_id: Optional[int] = Field(default=None, foreign_key="athlete.id", unique=True, index=True)
    athlete_status: Optional[UserAthleteApprovalStatus] = Field(
        default=None,
        sa_column=sa.Column(
            sa.Enum(
                UserAthleteApprovalStatus,
                name="userathleteapprovalstatus",
                values_callable=lambda e: [item.value for item in e],
            ),
            nullable=True,
        ),
    )
    rejection_reason: Optional[str] = None
    is_active: bool = Field(default=True)
    must_change_password: bool = Field(default=False)
    last_login_at: Optional[datetime] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)

    athlete: Optional["Athlete"] = Relationship(back_populates="user")
    created_events: List["Event"] = Relationship(
        back_populates="created_by",
        sa_relationship_kwargs={"foreign_keys": "Event.created_by_id"},
    )
    teams: List["Team"] = Relationship(back_populates="coaches", link_model=CoachTeamLink)
