"""Add team_combine_metric table.

Revision ID: 202502211100
Revises: 202502201200
Create Date: 2025-02-21 11:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "202502211100"
down_revision: Union[str, None] = "202502201200"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "team_combine_metric",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("athlete_id", sa.Integer(), nullable=True),
        sa.Column("recorded_by_id", sa.Integer(), nullable=False),
        sa.Column(
            "recorded_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("sitting_height_cm", sa.Float(), nullable=True),
        sa.Column("standing_height_cm", sa.Float(), nullable=True),
        sa.Column("weight_kg", sa.Float(), nullable=True),
        sa.Column("split_10m_s", sa.Float(), nullable=True),
        sa.Column("split_20m_s", sa.Float(), nullable=True),
        sa.Column("split_35m_s", sa.Float(), nullable=True),
        sa.Column("yoyo_distance_m", sa.Float(), nullable=True),
        sa.Column("jump_cm", sa.Float(), nullable=True),
        sa.Column("max_power_kmh", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["team_id"], ["team.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["athlete_id"], ["athlete.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["recorded_by_id"], ["user.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_team_combine_metric_team_id", "team_combine_metric", ["team_id"])
    op.create_index(
        "ix_team_combine_metric_athlete_id",
        "team_combine_metric",
        ["athlete_id"],
    )
    op.create_index(
        "ix_team_combine_metric_recorded_at",
        "team_combine_metric",
        ["recorded_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_team_combine_metric_recorded_at", table_name="team_combine_metric")
    op.drop_index("ix_team_combine_metric_athlete_id", table_name="team_combine_metric")
    op.drop_index("ix_team_combine_metric_team_id", table_name="team_combine_metric")
    op.drop_table("team_combine_metric")
