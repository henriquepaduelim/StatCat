from datetime import date, datetime

from pydantic import ConfigDict
from sqlmodel import SQLModel

from app.models.athlete import (
    AthleteGender,
    AthleteStatus,
    PlayerRegistrationStatus,
    RegistrationCategory,
)


class AthleteBase(SQLModel):
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    birth_date: date
    dominant_foot: str | None = None
    gender: AthleteGender | None = AthleteGender.male
    height_cm: float | None = None
    weight_kg: float | None = None
    club_affiliation: str | None = None
    team_id: int | None = None
    primary_position: str | None = None
    secondary_position: str | None = None
    photo_url: str | None = None
    status: AthleteStatus = AthleteStatus.active
    registration_year: str | None = None
    registration_category: RegistrationCategory | None = None
    player_registration_status: PlayerRegistrationStatus | None = None
    preferred_position: str | None = None
    desired_shirt_number: str | None = None


class AthleteCreate(AthleteBase):
    """Payload used when creating a new athlete."""

    primary_position: str
    secondary_position: str | None = None


class AthleteRead(AthleteBase):
    id: int
    user_athlete_status: str | None = None
    user_rejection_reason: str | None = None

    model_config = ConfigDict(from_attributes=True)


class AthleteCreateResponse(SQLModel):
    athlete: AthleteRead
    athlete_user_created: bool
    invite_status: str


class AthleteUpdate(SQLModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    phone: str | None = None
    birth_date: date | None = None
    dominant_foot: str | None = None
    gender: AthleteGender | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    club_affiliation: str | None = None
    team_id: int | None = None
    primary_position: str | None = None
    secondary_position: str | None = None
    photo_url: str | None = None
    status: AthleteStatus | None = None
    registration_year: str | None = None
    registration_category: RegistrationCategory | None = None
    player_registration_status: PlayerRegistrationStatus | None = None
    preferred_position: str | None = None
    desired_shirt_number: str | None = None


class AthleteRegistrationCreate(SQLModel):
    first_name: str
    last_name: str
    birth_date: date
    gender: AthleteGender
    email: str
    phone: str
    registration_year: str
    team_id: int | None = None
    registration_category: RegistrationCategory
    player_registration_status: PlayerRegistrationStatus
    preferred_position: str | None = None
    desired_shirt_number: str | None = None


class AthleteDocumentPayload(SQLModel):
    label: str
    file_url: str


class AthletePaymentPayload(SQLModel):
    amount: float | None = None
    currency: str | None = None
    method: str | None = None
    reference: str | None = None
    receipt_url: str | None = None
    paid_at: datetime | None = None


class AthleteRegistrationCompletion(SQLModel):
    email: str | None = None
    phone: str | None = None
    address_line1: str
    address_line2: str | None = None
    city: str
    province: str
    postal_code: str
    country: str
    guardian_name: str | None = None
    guardian_relationship: str | None = None
    guardian_email: str | None = None
    guardian_phone: str | None = None
    secondary_guardian_name: str | None = None
    secondary_guardian_relationship: str | None = None
    secondary_guardian_email: str | None = None
    secondary_guardian_phone: str | None = None
    emergency_contact_name: str
    emergency_contact_relationship: str
    emergency_contact_phone: str
    medical_allergies: str | None = None
    medical_conditions: str | None = None
    physician_name: str | None = None
    physician_phone: str | None = None
    documents: list[AthleteDocumentPayload] | None = None
    payment: AthletePaymentPayload | None = None


class AthleteDocumentRead(AthleteDocumentPayload):
    id: int
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AthletePaymentRead(AthletePaymentPayload):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
