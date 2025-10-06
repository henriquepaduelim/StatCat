from datetime import date

from pydantic import ConfigDict
from sqlmodel import SQLModel


class AthleteBase(SQLModel):
    client_id: int | None = None
    first_name: str
    last_name: str
    email: str | None = None
    birth_date: date | None = None
    dominant_foot: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    club_affiliation: str | None = None
    photo_url: str | None = None


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
    height_cm: float | None = None
    weight_kg: float | None = None
    club_affiliation: str | None = None
