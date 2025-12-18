"""realign schema to models

Revision ID: aa2911f20456
Revises: 5541982457a6
Create Date: 2025-12-17 09:56:45.602595

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM


# revision identifiers, used by Alembic.
revision: str = "aa2911f20456"
down_revision: Union[str, Sequence[str], None] = "813b8a6cf1c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to match current models (events, participants, notifications, reports)."""

    # Drop dependent tables first (no data to preserve)
    op.drop_table("match_stat")
    op.drop_table("event_participant")
    op.drop_table("notification")
    op.drop_table("report_submission")
    op.drop_table("push_subscription")
    op.drop_table("event")
    op.execute("DROP TABLE IF EXISTS event_team_link")

    # Drop legacy enum type no longer used
    op.execute("DROP TYPE IF EXISTS eventstatus")

    # Recreate event table (aligned to Event model)
    event_type_enum = sa.Enum("game", "training", "other", name="eventtype")
    op.create_table(
        "event",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("event_type", event_type_enum, nullable=False),
        sa.Column("start_time", sa.DateTime(), nullable=True),
        sa.Column("end_time", sa.DateTime(), nullable=True),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "created_by_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False
        ),
    )

    # EventTeamLink junction table
    op.create_table(
        "event_team_link",
        sa.Column(
            "event_id", sa.Integer(), sa.ForeignKey("event.id"), primary_key=True
        ),
        sa.Column("team_id", sa.Integer(), sa.ForeignKey("team.id"), primary_key=True),
    )

    # Recreate event_participant (minimal)
    op.create_table(
        "event_participant",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "event_id",
            sa.Integer(),
            sa.ForeignKey("event.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "athlete_id",
            sa.Integer(),
            sa.ForeignKey("athlete.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    # Recreate notification (simplified)
    op.create_table(
        "notification",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("message", sa.String(), nullable=False),
        sa.Column("read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
    )

    # Recreate report_submission (minimal)
    rs_status_enum = ENUM(
        "pending",
        "approved",
        "rejected",
        name="reportsubmissionstatus",
        create_type=False,
    )
    rs_type_enum = ENUM(
        "injury",
        "wellness",
        name="reportsubmissiontype",
        create_type=False,
    )
    op.create_table(
        "report_submission",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("status", rs_status_enum, nullable=False, server_default="pending"),
        sa.Column("report_type", rs_type_enum, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "athlete_id", sa.Integer(), sa.ForeignKey("athlete.id"), nullable=True
        ),
    )
    op.create_index("ix_report_submission_status", "report_submission", ["status"])
    op.create_index(
        "ix_report_submission_report_type", "report_submission", ["report_type"]
    )

    # Recreate match_stat referencing new report_submission
    op.create_table(
        "match_stat",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "athlete_id", sa.Integer(), sa.ForeignKey("athlete.id"), nullable=False
        ),
        sa.Column("team_id", sa.Integer(), sa.ForeignKey("team.id"), nullable=True),
        sa.Column(
            "report_submission_id",
            sa.Integer(),
            sa.ForeignKey("report_submission.id"),
            nullable=True,
        ),
        sa.Column(
            "match_date", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("competition", sa.String(), nullable=True),
        sa.Column("opponent", sa.String(), nullable=True),
        sa.Column("venue", sa.String(), nullable=True),
        sa.Column("goals", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("assists", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("minutes_played", sa.Integer(), nullable=True),
        sa.Column(
            "shootout_attempts", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("shootout_goals", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("goals_conceded", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_match_stat_athlete_id", "match_stat", ["athlete_id"])
    op.create_index("ix_match_stat_team_id", "match_stat", ["team_id"])
    op.create_index(
        "ix_match_stat_report_submission_id", "match_stat", ["report_submission_id"]
    )
    op.create_index("ix_match_stat_match_date", "match_stat", ["match_date"])

    # Recreate push_subscription aligned to model
    op.create_table(
        "push_subscription",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("subscription_info", sa.String(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
    )

    # Adjust existing columns/indexes
    op.alter_column("team_combine_metric", "status", nullable=True)
    op.alter_column("user", "full_name", nullable=True)
    op.drop_index("ix_athlete_email", table_name="athlete")
    op.create_index("ix_athlete_email", "athlete", ["email"], unique=True)


def downgrade() -> None:
    """Downgrade not implemented (schema rebuild)."""
    raise NotImplementedError("Downgrade not supported for schema realignment")
