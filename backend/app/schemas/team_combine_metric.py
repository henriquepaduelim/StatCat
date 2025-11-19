from datetime import datetime

from pydantic import ConfigDict
from sqlmodel import SQLModel


class TeamCombineMetricBase(SQLModel):
    athlete_id: int | None = None
    sitting_height_cm: float | None = None
    standing_height_cm: float | None = None
    weight_kg: float | None = None
    split_10m_s: float | None = None
    split_20m_s: float | None = None
    split_35m_s: float | None = None
    yoyo_distance_m: float | None = None
    jump_cm: float | None = None
    max_power_kmh: float | None = None


class TeamCombineMetricCreate(TeamCombineMetricBase):
    recorded_at: datetime | None = None


class TeamCombineMetricRead(TeamCombineMetricBase):
    id: int
    team_id: int
    recorded_at: datetime
    recorded_by_id: int

    model_config = ConfigDict(from_attributes=True)
