"""Add report card fields and reopen status

Revision ID: 7e8a7db6483e
Revises: d7f187e5842c
Create Date: 2025-12-09 14:38:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7e8a7db6483e"
down_revision: Union[str, Sequence[str], None] = "d7f187e5842c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema for report cards."""
    # Extend enum for reopened status
    op.execute("ALTER TYPE reportsubmissionstatus ADD VALUE IF NOT EXISTS 'REOPENED'")

    # New fields for report cards
    op.add_column(
        "report_submission", sa.Column("coach_report", sa.Text(), nullable=True)
    )
    op.add_column(
        "report_submission",
        sa.Column("report_card_categories", sa.JSON(), nullable=True),
    )
    op.add_column(
        "report_submission", sa.Column("overall_average", sa.Float(), nullable=True)
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("report_submission", "overall_average")
    op.drop_column("report_submission", "report_card_categories")
    op.drop_column("report_submission", "coach_report")
    # Enum value REOPENED is left in place to avoid enum type recreation issues.
