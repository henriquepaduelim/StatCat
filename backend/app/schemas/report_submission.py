from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ReportCardCreate(BaseModel):
    athlete_id: int
    team_id: int | None = None
    technical_rating: int = Field(..., ge=1, le=5)
    physical_rating: int = Field(..., ge=1, le=5)
    training_rating: int = Field(..., ge=1, le=5)
    match_rating: int = Field(..., ge=1, le=5)
    general_notes: str | None = Field(default=None, max_length=2000)


class ReportSubmissionItem(BaseModel):
    id: int
    report_type: Literal["game_report", "report_card"]
    status: Literal["pending", "approved", "rejected"]
    team_name: str | None = None
    opponent: str | None = None
    athlete_name: str | None = None
    match_date: datetime | None = None
    goals_for: int | None = None
    goals_against: int | None = None
    technical_rating: int | None = None
    physical_rating: int | None = None
    training_rating: int | None = None
    match_rating: int | None = None
    general_notes: str | None = None
    review_notes: str | None = None
    submitted_by: str
    created_at: datetime

    class Config:
        from_attributes = True


class ReportSubmissionReview(BaseModel):
    notes: str = Field(..., min_length=3, max_length=2000)
