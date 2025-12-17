from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class AthletePayment(SQLModel, table=True):
    __tablename__ = "athletepayment"

    id: Optional[int] = Field(default=None, primary_key=True)
    athlete_id: int = Field(foreign_key="athlete.id", index=True)
    amount: Optional[float] = None
    currency: Optional[str] = None
    method: Optional[str] = None
    reference: Optional[str] = None
    receipt_url: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)