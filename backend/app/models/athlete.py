from datetime import date
from enum import Enum
from typing import TYPE_CHECKING, List, Optional

from sqlmodel import Field, Relationship, SQLModel

# Use TYPE_CHECKING to prevent circular imports at runtime,
# while still allowing type checkers to see the import.
if TYPE_CHECKING:
    from .report_submission import ReportSubmission
    from .user import User
    from .event_participant import EventParticipant


class AthleteGender(str, Enum):
    male = "male"
    female = "female"


class AthleteStatus(str, Enum):
    active = "active"
    inactive = "inactive"


class RegistrationCategory(str, Enum):
    youth = "youth"
    senior = "senior"
    trial = "trial"
    return_player = "return_player"


class PlayerRegistrationStatus(str, Enum):
    new = "new"
    transfer = "transfer"
    return_player = "return_player"
    guest = "guest"


class Athlete(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    first_name: str = Field(index=True, nullable=False)
    last_name: str = Field(index=True, nullable=False)
    email: str = Field(unique=False, index=True, nullable=False)
    phone: Optional[str] = Field(default=None, index=True)
    birth_date: date = Field(nullable=False)
    dominant_foot: Optional[str] = Field(default=None, index=True)
    gender: Optional[AthleteGender] = Field(default=None, index=True)
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    club_affiliation: Optional[str] = None
    team_id: Optional[int] = Field(default=None, foreign_key="team.id", index=True)
    primary_position: str = Field(index=True, nullable=False)
    secondary_position: Optional[str] = Field(default=None, index=True)
    photo_url: Optional[str] = None
    status: AthleteStatus = Field(
        default=AthleteStatus.active, index=True, nullable=False
    )
    registration_year: Optional[str] = Field(default=None, index=True)
    registration_category: Optional[RegistrationCategory] = Field(
        default=None, index=True
    )
    player_registration_status: Optional[PlayerRegistrationStatus] = Field(
        default=None, index=True
    )
    preferred_position: Optional[str] = None
    desired_shirt_number: Optional[str] = None

    # Relacionamento bidirecional:
    # Este atributo conterá a lista de submissões de relatório para este atleta.
    # `back_populates` aponta para o atributo "athlete" no modelo ReportSubmission.
    report_submissions: List["ReportSubmission"] = Relationship(
        back_populates="athlete"
    )

    # One-to-one link to User.
    user: "User" = Relationship(back_populates="athlete")

    event_participations: List["EventParticipant"] = Relationship(
        back_populates="athlete"
    )
