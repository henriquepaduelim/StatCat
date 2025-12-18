from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class AthleteDetail(SQLModel, table=True):
    __tablename__ = "athletedetail"

    athlete_id: int = Field(foreign_key="athlete.id", primary_key=True)
    email: Optional[str] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_relationship: Optional[str] = None
    guardian_email: Optional[str] = None
    guardian_phone: Optional[str] = None
    secondary_guardian_name: Optional[str] = None
    secondary_guardian_relationship: Optional[str] = None
    secondary_guardian_email: Optional[str] = None
    secondary_guardian_phone: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    medical_allergies_encrypted: Optional[str] = None
    medical_conditions_encrypted: Optional[str] = None
    physician_name_encrypted: Optional[str] = None
    physician_phone_encrypted: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
