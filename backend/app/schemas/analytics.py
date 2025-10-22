from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel


class MetricComponent(BaseModel):
    label: str
    value: float | None
    unit: str | None = None
    extra: dict[str, Any] | None = None


class MetricScore(BaseModel):
    id: str
    name: str
    category: str
    description: str
    direction: Literal["higher_is_better", "lower_is_better", "mixed"]
    value: float | None
    unit: str | None = None
    components: list[MetricComponent] = []
    tags: list[str] = []


class AthleteMetricsResponse(BaseModel):
    athlete_id: int
    metrics: list[MetricScore]


class RankingEntry(BaseModel):
    athlete_id: int
    full_name: str
    value: float
    unit: str | None = None
    team: str | None = None
    age: int | None = None
    gender: str | None = None


class MetricRankingResponse(BaseModel):
    metric: MetricScore
    entries: list[RankingEntry]


class GameLeaderboardEntry(BaseModel):
    athlete_id: int
    full_name: str
    value: float
    team: str | None = None
    matches: int | None = None


class GameLeaderboardResponse(BaseModel):
    leaderboard_type: Literal["top_scorers", "top_shooters"]
    entries: list[GameLeaderboardEntry]


class LeaderboardEntry(BaseModel):
    athlete_id: int
    full_name: str
    team: str | None = None
    age_category: str | None = None
    position: str | None = None
    goals: int = 0
    shootout_goals: int = 0


class LeaderboardResponse(BaseModel):
    leaderboard_type: Literal["scorers", "shootouts"]
    entries: list[LeaderboardEntry]
