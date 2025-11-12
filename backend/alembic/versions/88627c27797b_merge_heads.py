"""merge heads

Revision ID: 88627c27797b
Revises: 5c1b52d75a2b, event_team_link_004
Create Date: 2025-11-12 08:55:31.818413

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '88627c27797b'
down_revision: Union[str, Sequence[str], None] = ('5c1b52d75a2b', 'event_team_link_004')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
