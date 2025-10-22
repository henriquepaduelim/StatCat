from __future__ import annotations

from datetime import datetime

from pydantic import ConfigDict
from sqlmodel import SQLModel


class GroupBase(SQLModel):
    name: str
    description: str | None = None


class GroupCreate(GroupBase):
    client_id: int | None = None
    member_ids: list[int] = []


class GroupUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    member_ids: list[int] | None = None


class GroupRead(GroupBase):
    id: int
    client_id: int
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    member_ids: list[int]

    model_config = ConfigDict(from_attributes=True)

