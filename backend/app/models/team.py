from __future__ import annotations

from datetime import datetime

from sqlmodel import Field, SQLModel


class Team(SQLModel, table=True):
    __tablename__ = "team"

    id: int | None = Field(default=None, primary_key=True)
    client_id: int = Field(foreign_key="client.id", index=True)
    name: str = Field(index=True)
    age_category: str = Field(index=True)
    description: str | None = None
    coach_name: str | None = Field(default=None)
    created_by_id: int | None = Field(default=None, foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )
