from datetime import datetime

from sqlmodel import Field, SQLModel


class TeamCombineMetric(SQLModel, table=True):
    """Aggregate combine metrics collected for a given team."""

    __tablename__ = "team_combine_metric"

    id: int | None = Field(default=None, primary_key=True)
    team_id: int = Field(foreign_key="team.id", index=True)
    athlete_id: int | None = Field(default=None, foreign_key="athlete.id", index=True)
    recorded_by_id: int = Field(foreign_key="user.id", index=True)
    recorded_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    sitting_height_cm: float | None = Field(default=None)
    standing_height_cm: float | None = Field(default=None)
    weight_kg: float | None = Field(default=None)
    split_10m_s: float | None = Field(default=None)
    split_20m_s: float | None = Field(default=None)
    split_35m_s: float | None = Field(default=None)
    yoyo_distance_m: float | None = Field(default=None)
    jump_cm: float | None = Field(default=None)
    max_power_kmh: float | None = Field(default=None)
