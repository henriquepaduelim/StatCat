from datetime import date

from sqlmodel import Field, SQLModel


class Athlete(SQLModel, table=True):
    """Basic athlete profile captured during registration."""

    id: int | None = Field(default=None, primary_key=True)
    client_id: int | None = Field(default=None, foreign_key="client.id", index=True)
    first_name: str
    last_name: str
    email: str | None = Field(default=None, index=True)
    birth_date: date | None = None
    dominant_foot: str | None = Field(default=None, index=True)
    height_cm: float | None = None
    weight_kg: float | None = None
    club_affiliation: str | None = None
    photo_url: str | None = None
