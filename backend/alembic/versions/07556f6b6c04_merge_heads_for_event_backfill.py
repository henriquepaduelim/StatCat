"""merge heads for event backfill

Revision ID: 07556f6b6c04
Revises: 7c3f6a7f4f47, f4a45ed8c0af
Create Date: 2026-01-02 16:30:44.294771

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '07556f6b6c04'
down_revision: Union[str, Sequence[str], None] = ('7c3f6a7f4f47', 'f4a45ed8c0af')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
