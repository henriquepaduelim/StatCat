"""add goals_conceded to match_stat

Revision ID: 1d5b0ba2a9b5
Revises: 88627c27797b
Create Date: 2025-11-13 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1d5b0ba2a9b5"
down_revision: Union[str, Sequence[str], None] = "88627c27797b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "match_stat",
        sa.Column("goals_conceded", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("match_stat", "goals_conceded")
