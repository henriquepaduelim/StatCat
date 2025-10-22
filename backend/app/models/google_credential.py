from __future__ import annotations

from datetime import datetime

from sqlmodel import Field, SQLModel


class GoogleCredential(SQLModel, table=True):
    __tablename__ = "google_credential"
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    client_id: int | None = Field(default=None, foreign_key="client.id", index=True)
    account_email: str = Field(index=True)
    google_user_id: str | None = Field(default=None, index=True)
    calendar_id: str = Field(default="primary")
    access_token: str
    refresh_token: str
    token_type: str | None = Field(default=None)
    expires_at: datetime | None = Field(default=None, index=True)
    scope: str | None = None
    synced_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )
