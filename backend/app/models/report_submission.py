from __future__ import annotations

import enum
from datetime import datetime

from sqlmodel import Column, Enum, Field, SQLModel


class ReportSubmissionType(str, enum.Enum):
    GAME = "game_report"
    REPORT_CARD = "report_card"


class ReportSubmissionStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ReportSubmission(SQLModel, table=True):
    __tablename__ = "report_submission"

    id: int | None = Field(default=None, primary_key=True)
    report_type: ReportSubmissionType = Field(sa_column=Column(Enum(ReportSubmissionType)))
    status: ReportSubmissionStatus = Field(
        default=ReportSubmissionStatus.PENDING,
        sa_column=Column(Enum(ReportSubmissionStatus)),
    )
    submitted_by_id: int = Field(foreign_key="user.id", index=True)
    approved_by_id: int | None = Field(default=None, foreign_key="user.id", index=True)
    team_id: int | None = Field(default=None, foreign_key="team.id", index=True)
    athlete_id: int | None = Field(default=None, foreign_key="athlete.id", index=True)
    opponent: str | None = None
    match_date: datetime | None = None
    goals_for: int | None = None
    goals_against: int | None = None
    notes: str | None = None
    technical_rating: int | None = Field(default=None)
    physical_rating: int | None = Field(default=None)
    training_rating: int | None = Field(default=None)
    match_rating: int | None = Field(default=None)
    general_notes: str | None = Field(default=None)
    review_notes: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    approved_at: datetime | None = None
