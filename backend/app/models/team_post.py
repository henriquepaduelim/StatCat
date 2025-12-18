from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class TeamPost(SQLModel, table=True):
    """Simple feed entry posted by a team member."""

    __tablename__ = "team_post"

    id: int | None = Field(default=None, primary_key=True)
    team_id: int = Field(foreign_key="team.id", index=True)
    author_id: int = Field(foreign_key="user.id", index=True)
    content: str = Field(max_length=2000)
    media_url: str | None = Field(default=None, max_length=500)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), index=True, nullable=False
    )
