from __future__ import annotations

from datetime import datetime

from pydantic import ConfigDict
from sqlmodel import SQLModel


class GoogleCredentialCreate(SQLModel):
    access_token: str
    refresh_token: str
    token_type: str | None = None
    expires_at: datetime | None = None
    scope: str | None = None
    calendar_id: str | None = None
    account_email: str
    google_user_id: str | None = None


class GoogleCredentialRead(SQLModel):
    id: int
    user_id: int
    client_id: int | None
    account_email: str
    calendar_id: str
    expires_at: datetime | None
    scope: str | None
    synced_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

