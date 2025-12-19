from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class PasswordSetupCode(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    code_hash: str
    expires_at: datetime = Field(index=True)
    used_at: Optional[datetime] = Field(default=None, index=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), index=True
    )
