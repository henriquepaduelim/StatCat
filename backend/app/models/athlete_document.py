from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class AthleteDocument(SQLModel, table=True):
    __tablename__ = "athletedocument"

    id: Optional[int] = Field(default=None, primary_key=True)
    athlete_id: int = Field(foreign_key="athlete.id", index=True)
    label: str
    file_url: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)