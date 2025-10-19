from datetime import datetime

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    full_name: str
    role: str = Field(default="staff")  # "staff" | "club" | "athlete"
    client_id: int | None = Field(default=None, foreign_key="client.id")
    athlete_id: int | None = Field(default=None, foreign_key="athlete.id", index=True)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
