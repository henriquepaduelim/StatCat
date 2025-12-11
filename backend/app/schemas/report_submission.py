from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ReportCardMetric(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    score: int | None = Field(default=None, ge=1, le=100)


class ReportCardCategory(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    metrics: list[ReportCardMetric] = Field(default_factory=list)
    group_average: float | None = None


class ReportCardCreate(BaseModel):
    athlete_id: int
    team_id: int | None = None
    coach_report: str = Field(..., min_length=1, max_length=2000)
    categories: list[ReportCardCategory] = Field(default_factory=list)


class ReportSubmissionItem(BaseModel):
    id: int
    report_type: Literal["game_report", "report_card"]
    status: Literal["pending", "approved", "rejected", "reopened"]
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
    coach_report: str | None = None
    categories: list[ReportCardCategory] | None = None
    overall_average: float | None = None
    review_notes: str | None = None
    submitted_by: str
    created_at: datetime

    class Config:
        from_attributes = True


class ReportSubmissionReview(BaseModel):
    notes: str = Field(..., min_length=3, max_length=2000)
