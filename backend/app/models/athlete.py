from datetime import date, datetime

from enum import Enum

from sqlmodel import Field, SQLModel


class AthleteStatus(str, Enum):
    active = "active"
    inactive = "inactive"


class AthleteGender(str, Enum):
    male = "male"
    female = "female"


class RegistrationCategory(str, Enum):
    youth = "youth"
    senior = "senior"
    trial = "trial"
    return_player = "return"


class PlayerRegistrationStatus(str, Enum):
    new = "new"
    transfer = "transfer"
    return_player = "return"
    guest = "guest"


class Athlete(SQLModel, table=True):
    """Basic athlete profile captured during registration."""

    id: int | None = Field(default=None, primary_key=True)
    client_id: int | None = Field(default=None, foreign_key="client.id", index=True)
    team_id: int | None = Field(default=None, foreign_key="team.id", index=True)
    first_name: str
    last_name: str
    email: str | None = Field(default=None, index=True)
    phone: str | None = Field(default=None, index=True)
    birth_date: date
    dominant_foot: str | None = Field(default=None, index=True)
    gender: AthleteGender | None = Field(default=AthleteGender.male, index=True)
    height_cm: float | None = None
    weight_kg: float | None = None
    club_affiliation: str | None = None
    primary_position: str = Field(default="unknown", index=True)
    secondary_position: str | None = Field(default=None, index=True)
    photo_url: str | None = None
    status: AthleteStatus = Field(default=AthleteStatus.active, index=True)
    registration_year: str | None = Field(default=None, index=True)
    registration_category: RegistrationCategory | None = Field(default=None, index=True)
    player_registration_status: PlayerRegistrationStatus | None = Field(default=None, index=True)
    preferred_position: str | None = None
    desired_shirt_number: str | None = None
class AthleteDetail(SQLModel, table=True):
    athlete_id: int = Field(primary_key=True, foreign_key="athlete.id")
    email: str | None = None
    phone: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    province: str | None = None
    postal_code: str | None = None
    country: str | None = None
    guardian_name: str | None = None
    guardian_relationship: str | None = None
    guardian_email: str | None = None
    guardian_phone: str | None = None
    secondary_guardian_name: str | None = None
    secondary_guardian_relationship: str | None = None
    secondary_guardian_email: str | None = None
    secondary_guardian_phone: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_relationship: str | None = None
    emergency_contact_phone: str | None = None
    medical_allergies_encrypted: str | None = None
    medical_conditions_encrypted: str | None = None
    physician_name_encrypted: str | None = None
    physician_phone_encrypted: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AthleteDocument(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    athlete_id: int = Field(foreign_key="athlete.id", index=True)
    label: str
    file_url: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)


class AthletePayment(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    athlete_id: int = Field(foreign_key="athlete.id", index=True)
    amount: float | None = None
    currency: str | None = None
    method: str | None = None
    reference: str | None = None
    receipt_url: str | None = None
    paid_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
