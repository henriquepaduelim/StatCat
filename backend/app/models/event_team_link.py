from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .event import Event
    from .team import Team


class EventTeamLink(SQLModel, table=True):
    __tablename__ = "event_team_link"

    event_id: int = Field(foreign_key="event.id", primary_key=True)
    team_id: int = Field(foreign_key="team.id", primary_key=True)

    # This is the missing relationship
    event: "Event" = Relationship(back_populates="teams")
    team: "Team" = Relationship(back_populates="event_links")
