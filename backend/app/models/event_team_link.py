"""Association table linking events and teams."""
from sqlmodel import Field, SQLModel


class EventTeamLink(SQLModel, table=True):
    """Stores many-to-many relationships between events and teams."""

    __tablename__ = "event_team_link"

    event_id: int = Field(foreign_key="event.id", primary_key=True)
    team_id: int = Field(foreign_key="team.id", primary_key=True)
