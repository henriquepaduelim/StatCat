"""Restore full schema with approval fields and uppercase enums.

Revision ID: f1b5c3d5ab12
Revises: aa2911f20456
Create Date: 2025-12-17 12:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.db.types import SafeDate, SafeTime

# revision identifiers, used by Alembic.
revision: str = "f1b5c3d5ab12"
down_revision: Union[str, Sequence[str], None] = "aa2911f20456"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _drop_if_exists(table_name: str) -> None:
    op.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')


def _drop_enum(type_name: str) -> None:
    op.execute(f"DROP TYPE IF EXISTS {type_name} CASCADE")


def upgrade() -> None:
    """Recreate legacy tables and enums expected by the application."""
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        # Skip Postgres-specific enum/table recreation on SQLite
        return

    # Drop simplified tables created in the last realignment
    _drop_if_exists("match_stat")
    _drop_if_exists("event_participant")
    _drop_if_exists("notification")
    _drop_if_exists("report_submission")
    _drop_if_exists("push_subscription")
    _drop_if_exists("event")
    _drop_if_exists("event_team_link")

    # Temporarily change enum columns to text to allow type recreation
    op.execute('ALTER TABLE "user" ALTER COLUMN role TYPE varchar USING role::text')
    op.execute(
        'ALTER TABLE "user" ALTER COLUMN athlete_status TYPE varchar USING athlete_status::text'
    )
    op.execute(
        "ALTER TABLE team_combine_metric ALTER COLUMN status TYPE varchar USING status::text"
    )

    # Normalize casing after converting to text
    op.execute('UPDATE "user" SET role = UPPER(role) WHERE role IS NOT NULL')
    op.execute(
        'UPDATE "user" SET athlete_status = UPPER(athlete_status) WHERE athlete_status IS NOT NULL'
    )
    op.execute(
        "UPDATE team_combine_metric SET status = UPPER(status) WHERE status IS NOT NULL"
    )

    # Drop lowercase/legacy enums
    _drop_enum("userrole")
    _drop_enum("userathleteapprovalstatus")
    _drop_enum("participantstatus")
    _drop_enum("reportsubmissionstatus")
    _drop_enum("reportsubmissiontype")
    _drop_enum("combinemetricstatus")
    _drop_enum("eventstatus")
    _drop_enum("eventtype")

    # Recreate enums in uppercase (legacy schema)
    op.execute("CREATE TYPE userrole AS ENUM ('ADMIN','STAFF','COACH','ATHLETE')")
    op.execute(
        "CREATE TYPE userathleteapprovalstatus AS ENUM ('INCOMPLETE','PENDING','APPROVED','REJECTED')"
    )
    participant_enum = sa.Enum(
        "INVITED", "CONFIRMED", "DECLINED", "MAYBE", name="participantstatus"
    )
    report_status_enum = sa.Enum(
        "PENDING", "APPROVED", "REJECTED", "REOPENED", name="reportsubmissionstatus"
    )
    report_type_enum = sa.Enum("GAME", "REPORT_CARD", name="reportsubmissiontype")
    combine_status_enum = sa.Enum(
        "PENDING", "APPROVED", "REJECTED", name="combinemetricstatus"
    )
    combine_status_enum.create(bind, checkfirst=True)
    event_status_enum = sa.Enum(
        "SCHEDULED", "CANCELLED", "COMPLETED", name="eventstatus"
    )

    # Re-apply enum types to existing columns
    op.execute(
        'ALTER TABLE "user" ALTER COLUMN role TYPE userrole USING role::userrole'
    )
    op.execute(
        'ALTER TABLE "user" ALTER COLUMN athlete_status TYPE userathleteapprovalstatus USING athlete_status::userathleteapprovalstatus'
    )
    op.execute(
        "ALTER TABLE team_combine_metric ALTER COLUMN status TYPE combinemetricstatus USING status::combinemetricstatus"
    )
    op.execute("ALTER TABLE team_combine_metric ALTER COLUMN status SET NOT NULL")
    op.execute(
        "ALTER TABLE team_combine_metric ALTER COLUMN status SET DEFAULT 'PENDING'"
    )

    # user.full_name must be not null per legacy schema
    op.execute('UPDATE "user" SET full_name = email WHERE full_name IS NULL')
    op.alter_column("user", "full_name", nullable=False)

    # athlete.email was non-unique originally
    op.drop_index("ix_athlete_email", table_name="athlete")
    op.create_index(op.f("ix_athlete_email"), "athlete", ["email"], unique=False)

    # Recreate event table
    op.create_table(
        "event",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_date", SafeDate(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("start_time", SafeTime(), nullable=True),
        sa.Column("location", sa.String(length=500), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", event_status_enum, nullable=True),
        sa.Column("team_id", sa.Integer(), sa.ForeignKey("team.id"), nullable=True),
        sa.Column(
            "created_by_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False
        ),
        sa.Column("coach_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column(
            "email_sent", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column("push_sent", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index(op.f("ix_event_coach_id"), "event", ["coach_id"])
    op.create_index(op.f("ix_event_created_at"), "event", ["created_at"])
    op.create_index(op.f("ix_event_created_by_id"), "event", ["created_by_id"])
    op.create_index(op.f("ix_event_team_id"), "event", ["team_id"])

    # Optional multi-team association
    op.create_table(
        "event_team_link",
        sa.Column(
            "event_id",
            sa.Integer(),
            sa.ForeignKey("event.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "team_id",
            sa.Integer(),
            sa.ForeignKey("team.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )

    # Event participants
    op.create_table(
        "event_participant",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "event_id",
            sa.Integer(),
            sa.ForeignKey("event.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=True),
        sa.Column(
            "athlete_id", sa.Integer(), sa.ForeignKey("athlete.id"), nullable=True
        ),
        sa.Column("status", participant_enum, nullable=True),
        sa.Column("invited_at", sa.DateTime(), nullable=False),
        sa.Column("responded_at", sa.DateTime(), nullable=True),
    )
    op.create_index(
        op.f("ix_event_participant_event_id"), "event_participant", ["event_id"]
    )
    op.create_index(
        op.f("ix_event_participant_user_id"), "event_participant", ["user_id"]
    )
    op.create_index(
        op.f("ix_event_participant_athlete_id"), "event_participant", ["athlete_id"]
    )

    # Notifications
    op.create_table(
        "notification",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("event.id"), nullable=True),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("channel", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("sent", sa.Boolean(), nullable=False),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("read", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index(op.f("ix_notification_user_id"), "notification", ["user_id"])
    op.create_index(op.f("ix_notification_event_id"), "notification", ["event_id"])
    op.create_index(op.f("ix_notification_created_at"), "notification", ["created_at"])

    # Report submissions (full)
    op.create_table(
        "report_submission",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("report_type", report_type_enum, nullable=True),
        sa.Column(
            "status", report_status_enum, nullable=False, server_default="PENDING"
        ),
        sa.Column(
            "submitted_by_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False
        ),
        sa.Column(
            "approved_by_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=True
        ),
        sa.Column("team_id", sa.Integer(), sa.ForeignKey("team.id"), nullable=True),
        sa.Column(
            "athlete_id", sa.Integer(), sa.ForeignKey("athlete.id"), nullable=True
        ),
        sa.Column("opponent", sa.String(), nullable=True),
        sa.Column("match_date", sa.DateTime(), nullable=True),
        sa.Column("goals_for", sa.Integer(), nullable=True),
        sa.Column("goals_against", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("technical_rating", sa.Integer(), nullable=True),
        sa.Column("physical_rating", sa.Integer(), nullable=True),
        sa.Column("training_rating", sa.Integer(), nullable=True),
        sa.Column("match_rating", sa.Integer(), nullable=True),
        sa.Column("general_notes", sa.Text(), nullable=True),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("coach_report", sa.Text(), nullable=True),
        sa.Column("report_card_categories", sa.JSON(), nullable=True),
        sa.Column("overall_average", sa.Float(), nullable=True),
    )
    op.create_index(
        op.f("ix_report_submission_approved_by_id"),
        "report_submission",
        ["approved_by_id"],
    )
    op.create_index(
        op.f("ix_report_submission_athlete_id"), "report_submission", ["athlete_id"]
    )
    op.create_index(
        op.f("ix_report_submission_created_at"), "report_submission", ["created_at"]
    )
    op.create_index(
        op.f("ix_report_submission_submitted_by_id"),
        "report_submission",
        ["submitted_by_id"],
    )
    op.create_index(
        op.f("ix_report_submission_team_id"), "report_submission", ["team_id"]
    )

    # Match stats
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
        sa.Column("match_date", sa.DateTime(), nullable=False),
        sa.Column("competition", sa.String(), nullable=True),
        sa.Column("opponent", sa.String(), nullable=True),
        sa.Column("venue", sa.String(), nullable=True),
        sa.Column("goals", sa.Integer(), nullable=False),
        sa.Column("assists", sa.Integer(), nullable=False),
        sa.Column("minutes_played", sa.Integer(), nullable=True),
        sa.Column("shootout_attempts", sa.Integer(), nullable=False),
        sa.Column("shootout_goals", sa.Integer(), nullable=False),
        sa.Column("goals_conceded", sa.Integer(), nullable=False),
    )
    op.create_index(op.f("ix_match_stat_athlete_id"), "match_stat", ["athlete_id"])
    op.create_index(op.f("ix_match_stat_team_id"), "match_stat", ["team_id"])
    op.create_index(
        op.f("ix_match_stat_report_submission_id"),
        "match_stat",
        ["report_submission_id"],
    )
    op.create_index(op.f("ix_match_stat_match_date"), "match_stat", ["match_date"])

    # Push subscriptions
    op.create_table(
        "push_subscription",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("endpoint", sa.String(), nullable=False),
        sa.Column("p256dh", sa.String(), nullable=False),
        sa.Column("auth", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        op.f("ix_push_subscription_user_id"),
        "push_subscription",
        ["user_id"],
        unique=True,
    )


def downgrade() -> None:
    """Downgrade is not supported for this restoration."""
    raise NotImplementedError("Downgrade not supported for this restoration")
