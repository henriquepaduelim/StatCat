from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Group(SQLModel, table=True):
    __tablename__ = "athlete_group"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: Optional[str] = None
    created_by_id: int = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class GroupMembership(SQLModel, table=True):
    __tablename__ = "group_membership"

    id: Optional[int] = Field(default=None, primary_key=True)
    group_id: int = Field(foreign_key="athlete_group.id")
    athlete_id: int = Field(foreign_key="athlete.id")
    added_by_id: Optional[int] = Field(default=None, foreign_key="user.id")
    added_at: datetime = Field(default_factory=datetime.utcnow)
