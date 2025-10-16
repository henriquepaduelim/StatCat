from datetime import date

from pydantic import ConfigDict
from sqlmodel import SQLModel

from app.models.athlete import AthleteGender, AthleteStatus


class AthleteBase(SQLModel):
    client_id: int | None = None
    first_name: str
    last_name: str
    email: str
    birth_date: date
    dominant_foot: str | None = None
    gender: AthleteGender | None = AthleteGender.male
    height_cm: float | None = None
    weight_kg: float | None = None
    club_affiliation: str | None = None
    photo_url: str | None = None
    status: AthleteStatus = AthleteStatus.active


class AthleteCreate(AthleteBase):
    """Payload used when creating a new athlete."""


class AthleteRead(AthleteBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class AthleteUpdate(SQLModel):
    client_id: int | None = None
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    birth_date: date | None = None
    dominant_foot: str | None = None
    gender: AthleteGender | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    club_affiliation: str | None = None
    photo_url: str | None = None
    status: AthleteStatus | None = None
