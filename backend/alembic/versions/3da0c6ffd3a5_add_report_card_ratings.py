"""add report card rating fields

Revision ID: 3da0c6ffd3a5
Revises: 2a4f1e2d8f0b
Create Date: 2025-11-13 17:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "3da0c6ffd3a5"
down_revision: Union[str, Sequence[str], None] = "2a4f1e2d8f0b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("report_submission", sa.Column("technical_rating", sa.Integer(), nullable=True))
    op.add_column("report_submission", sa.Column("physical_rating", sa.Integer(), nullable=True))
    op.add_column("report_submission", sa.Column("training_rating", sa.Integer(), nullable=True))
    op.add_column("report_submission", sa.Column("match_rating", sa.Integer(), nullable=True))
    op.add_column("report_submission", sa.Column("general_notes", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("report_submission", "general_notes")
    op.drop_column("report_submission", "match_rating")
    op.drop_column("report_submission", "training_rating")
    op.drop_column("report_submission", "physical_rating")
    op.drop_column("report_submission", "technical_rating")
