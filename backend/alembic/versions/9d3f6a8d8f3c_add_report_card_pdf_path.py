"""Add report_card_pdf_path to report_submission

Revision ID: 9d3f6a8d8f3c
Revises: 7e8a7db6483e
Create Date: 2025-12-10 12:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9d3f6a8d8f3c"
down_revision: Union[str, Sequence[str], None] = "7e8a7db6483e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "report_submission",
        sa.Column("report_card_pdf_path", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("report_submission", "report_card_pdf_path")
