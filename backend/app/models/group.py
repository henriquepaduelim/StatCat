from __future__ import annotations

from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class Group(SQLModel, table=True):
    __tablename__ = "athlete_group"
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: str | None = None
    created_by_id: int = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={"onupdate": datetime.now(timezone.utc)},
    )


class GroupMembership(SQLModel, table=True):
    __tablename__ = "group_membership"
    id: int | None = Field(default=None, primary_key=True)
    group_id: int = Field(foreign_key="athlete_group.id", index=True)
    athlete_id: int = Field(foreign_key="athlete.id", index=True)
    added_by_id: int | None = Field(default=None, foreign_key="user.id")
    added_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
