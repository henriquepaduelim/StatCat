"""Drop report_card_pdf_path from report_submission

Revision ID: e1e7f8d5b9aa
Revises: 9d3f6a8d8f3c
Create Date: 2026-01-19 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e1e7f8d5b9aa"
down_revision: Union[str, Sequence[str], None] = "9d3f6a8d8f3c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("report_submission", "report_card_pdf_path")


def downgrade() -> None:
    op.add_column("report_submission", sa.Column("report_card_pdf_path", sa.String(), nullable=True))
