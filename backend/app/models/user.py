import enum
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Column, Enum
from sqlmodel import Field, Relationship, SQLModel

from .team import CoachTeamLink

if TYPE_CHECKING:
    from .team import Team


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    STAFF = "staff"
    COACH = "coach"
    ATHLETE = "athlete"


class AthleteStatus(str, enum.Enum):
    INCOMPLETE = "INCOMPLETE"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    full_name: str
    phone: str | None = Field(default=None, max_length=30)
    role: UserRole = Field(default=UserRole.ATHLETE, sa_column=Column(Enum(UserRole)))
    athlete_id: int | None = Field(default=None, foreign_key="athlete.id", index=True)
    athlete_status: AthleteStatus = Field(default=AthleteStatus.INCOMPLETE, sa_column=Column(Enum(AthleteStatus)))
    rejection_reason: Optional[str] = Field(default=None)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    teams: List["Team"] = Relationship(
        back_populates="coaches",
        link_model=CoachTeamLink,
    )
