from datetime import datetime, timezone
from typing import TYPE_CHECKING, List

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .user import User


class CoachTeamLink(SQLModel, table=True):
    user_id: int | None = Field(default=None, foreign_key="user.id", primary_key=True)
    team_id: int | None = Field(default=None, foreign_key="team.id", primary_key=True)


class Team(SQLModel, table=True):
    __tablename__ = "team"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    age_category: str = Field(index=True)
    description: str | None = None
    coach_name: str | None = None
    created_by_id: int | None = Field(default=None, foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={"onupdate": datetime.now(timezone.utc)},
    )

    coaches: List["User"] = Relationship(
        back_populates="teams",
        link_model=CoachTeamLink,
    )
