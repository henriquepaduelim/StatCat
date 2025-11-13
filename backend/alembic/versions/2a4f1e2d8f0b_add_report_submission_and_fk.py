"""add report submission table and fk

Revision ID: 2a4f1e2d8f0b
Revises: 1d5b0ba2a9b5
Create Date: 2025-11-13 16:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2a4f1e2d8f0b"
down_revision: Union[str, Sequence[str], None] = "1d5b0ba2a9b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "report_submission",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("report_type", sa.Enum("game_report", "report_card", name="reportsubmissiontype"), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "approved", "rejected", name="reportsubmissionstatus"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("submitted_by_id", sa.Integer(), nullable=False),
        sa.Column("approved_by_id", sa.Integer(), nullable=True),
        sa.Column("team_id", sa.Integer(), nullable=True),
        sa.Column("athlete_id", sa.Integer(), nullable=True),
        sa.Column("opponent", sa.String(), nullable=True),
        sa.Column("match_date", sa.DateTime(), nullable=True),
        sa.Column("goals_for", sa.Integer(), nullable=True),
        sa.Column("goals_against", sa.Integer(), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["submitted_by_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["approved_by_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["team.id"]),
        sa.ForeignKeyConstraint(["athlete_id"], ["athlete.id"]),
    )
    op.create_index("ix_report_submission_created_at", "report_submission", ["created_at"])
    op.create_index("ix_report_submission_team_id", "report_submission", ["team_id"])
    op.create_index("ix_report_submission_athlete_id", "report_submission", ["athlete_id"])
    op.add_column(
        "match_stat",
        sa.Column("report_submission_id", sa.Integer(), nullable=True),
    )
    op.create_index("ix_match_stat_report_submission_id", "match_stat", ["report_submission_id"])
    op.create_foreign_key(
        "fk_match_stat_report_submission_id",
        "match_stat",
        "report_submission",
        ["report_submission_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_match_stat_report_submission_id", "match_stat", type_="foreignkey")
    op.drop_index("ix_match_stat_report_submission_id", table_name="match_stat")
    op.drop_column("match_stat", "report_submission_id")
    op.drop_index("ix_report_submission_athlete_id", table_name="report_submission")
    op.drop_index("ix_report_submission_team_id", table_name="report_submission")
    op.drop_index("ix_report_submission_created_at", table_name="report_submission")
    op.drop_table("report_submission")
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":  # pragma: no cover - SQLite has no TYPE objects
        op.execute("DROP TYPE reportsubmissiontype")
        op.execute("DROP TYPE reportsubmissionstatus")
