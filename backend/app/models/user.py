import enum
from datetime import datetime
from typing import TYPE_CHECKING, List

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


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    full_name: str
    phone: str | None = Field(default=None, max_length=30)
    role: UserRole = Field(default=UserRole.ATHLETE, sa_column=Column(Enum(UserRole)))
    athlete_id: int | None = Field(default=None, foreign_key="athlete.id", index=True)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    teams: List["Team"] = Relationship(
        back_populates="coaches",
        link_model=CoachTeamLink,
    )
