"""make user_id nullable in event_participant

Revision ID: make_user_id_nullable_002
Revises: add_events_001
Create Date: 2025-01-04 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'make_user_id_nullable_002'
down_revision = 'add_events_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Make user_id nullable in event_participant table.
    This allows creating participants for athletes who don't have user accounts.
    """
    # SQLite doesn't support ALTER COLUMN directly, so we need to:
    # 1. Create new table with correct schema
    # 2. Copy data
    # 3. Drop old table
    # 4. Rename new table
    
    # For SQLite
    with op.batch_alter_table('event_participant', schema=None) as batch_op:
        batch_op.alter_column('user_id',
                              existing_type=sa.Integer(),
                              nullable=True)


def downgrade() -> None:
    """
    Make user_id NOT NULL again in event_participant table.
    """
    with op.batch_alter_table('event_participant', schema=None) as batch_op:
        batch_op.alter_column('user_id',
                              existing_type=sa.Integer(),
                              nullable=False)
