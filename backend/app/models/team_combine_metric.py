from datetime import datetime, timezone
from enum import Enum

import sqlalchemy as sa
from sqlmodel import Field, SQLModel


class CombineMetricStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class TeamCombineMetric(SQLModel, table=True):
    """Aggregate combine metrics collected for a given team."""

    __tablename__ = "team_combine_metric"

    id: int | None = Field(default=None, primary_key=True)
    team_id: int = Field(foreign_key="team.id", index=True)
    athlete_id: int | None = Field(default=None, foreign_key="athlete.id", index=True)
    
    status: CombineMetricStatus = Field(
        default=CombineMetricStatus.PENDING,
        sa_column=sa.Column(
            sa.Enum(
                CombineMetricStatus,
                name="combinemetricstatus",
                values_callable=lambda e: [item.value for item in e],
            ),
            index=True,
            nullable=False,
        ),
    )
    recorded_by_id: int = Field(foreign_key="user.id", index=True)
    approved_by_id: int | None = Field(default=None, foreign_key="user.id")
    
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)

    sitting_height_cm: float | None = Field(default=None)
    standing_height_cm: float | None = Field(default=None)
    weight_kg: float | None = Field(default=None)
    split_10m_s: float | None = Field(default=None)
    split_20m_s: float | None = Field(default=None)
    split_35m_s: float | None = Field(default=None)
    yoyo_distance_m: float | None = Field(default=None)
    jump_cm: float | None = Field(default=None)
    max_power_kmh: float | None = Field(default=None)
