from __future__ import annotations

from datetime import datetime

from sqlmodel import Field, SQLModel


class MatchStat(SQLModel, table=True):
    __tablename__ = "match_stat"

    id: int | None = Field(default=None, primary_key=True)
    athlete_id: int = Field(foreign_key="athlete.id", index=True)
    team_id: int | None = Field(default=None, foreign_key="team.id", index=True)
    report_submission_id: int | None = Field(default=None, foreign_key="report_submission.id", index=True)
    match_date: datetime = Field(default_factory=datetime.utcnow, index=True)
    competition: str | None = None
    opponent: str | None = None
    venue: str | None = None
    goals: int = Field(default=0)
    assists: int = Field(default=0)
    minutes_played: int | None = Field(default=None)
    shootout_attempts: int = Field(default=0)
    shootout_goals: int = Field(default=0)
    goals_conceded: int = Field(default=0)
