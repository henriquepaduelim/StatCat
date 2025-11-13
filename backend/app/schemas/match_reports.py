from __future__ import annotations

from datetime import datetime
from typing import List

from pydantic import BaseModel, Field, field_validator


class GoalScorerInput(BaseModel):
    athlete_id: int
    goals: int = Field(..., ge=1, description="Number of goals scored by the athlete in the match")
    shootout_goals: int = Field(
        default=0,
        ge=0,
        description="Goals scored during shootouts (not counted in regulation scoring)",
    )


class GoalkeeperInput(BaseModel):
    athlete_id: int
    conceded: int = Field(default=0, ge=0, description="Goals conceded while this athlete was in goal")


class GameReportCreate(BaseModel):
    team_id: int | None = Field(default=None)
    opponent: str = Field(..., min_length=1)
    date: datetime
    location: str | None = Field(default=None)
    goals_for: int = Field(default=0, ge=0)
    goals_against: int = Field(default=0, ge=0)
    goal_scorers: List[GoalScorerInput] = Field(default_factory=list)
    goalkeepers: List[GoalkeeperInput] = Field(default_factory=list)
    notes: str | None = Field(default=None)

    @field_validator("date", mode="before")
    @classmethod
    def parse_date(cls, value: datetime | str) -> datetime:
        if isinstance(value, datetime):
            return value
        if isinstance(value, str):
            try:
                # Support simple YYYY-MM-DD inputs by appending midnight time
                if len(value) == 10:
                    value = f"{value}T00:00:00"
                return datetime.fromisoformat(value)
            except ValueError as exc:  # pragma: no cover - validation guard
                raise ValueError("Invalid date format. Use ISO 8601.") from exc
        raise ValueError("Invalid date value.")


class GameReportResponse(BaseModel):
    created_entries: int
