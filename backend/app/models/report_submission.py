from enum import Enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

import sqlalchemy as sa
from sqlmodel import Field, Relationship, SQLModel

# Use TYPE_CHECKING para evitar importações circulares.
if TYPE_CHECKING:
    from .athlete import Athlete


class ReportSubmissionStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    REOPENED = "REOPENED"


class ReportSubmissionType(str, Enum):
    GAME = "GAME"
    REPORT_CARD = "REPORT_CARD"


class ReportSubmission(SQLModel, table=True):
    __tablename__ = "report_submission"

    id: Optional[int] = Field(default=None, primary_key=True)
    report_type: Optional[ReportSubmissionType] = Field(
        default=None,
        sa_column=sa.Column(
            sa.Enum(
                ReportSubmissionType,
                name="reportsubmissiontype",
                values_callable=lambda e: [item.value for item in e],
            ),
            index=True,
            nullable=True,
        ),
    )
    status: ReportSubmissionStatus = Field(
        default=ReportSubmissionStatus.PENDING,
        sa_column=sa.Column(
            sa.Enum(
                ReportSubmissionStatus,
                name="reportsubmissionstatus",
                values_callable=lambda e: [item.value for item in e],
            ),
            index=True,
        ),
    )
    submitted_by_id: int = Field(foreign_key="user.id", index=True)
    approved_by_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    team_id: Optional[int] = Field(default=None, foreign_key="team.id", index=True)
    athlete_id: Optional[int] = Field(default=None, foreign_key="athlete.id", index=True)
    opponent: Optional[str] = None
    match_date: Optional[datetime] = None
    goals_for: Optional[int] = None
    goals_against: Optional[int] = None
    notes: Optional[str] = None
    technical_rating: Optional[int] = None
    physical_rating: Optional[int] = None
    training_rating: Optional[int] = None
    match_rating: Optional[int] = None
    general_notes: Optional[str] = None
    review_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    approved_at: Optional[datetime] = None
    coach_report: Optional[str] = None
    report_card_categories: Optional[dict] = Field(default=None, sa_column=sa.Column(sa.JSON))
    overall_average: Optional[float] = None

    athlete: Optional["Athlete"] = Relationship(back_populates="report_submissions")
