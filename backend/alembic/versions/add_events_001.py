"""Add events and notifications tables

Revision ID: add_events_001
Revises: 
Create Date: 2025-11-04

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_events_001'
down_revision = None  # Update this with your latest migration
branch_labels = None
depends_on = None


def upgrade():
    # Create event table
    op.create_table(
        'event',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('date', sa.String(length=10), nullable=False),
        sa.Column('time', sa.String(length=5), nullable=True),
        sa.Column('location', sa.String(length=500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('scheduled', 'cancelled', 'completed', name='eventstatus'), nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('coach_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('email_sent', sa.Boolean(), nullable=False, default=False),
        sa.Column('push_sent', sa.Boolean(), nullable=False, default=False),
        sa.ForeignKeyConstraint(['team_id'], ['team.id'], ),
        sa.ForeignKeyConstraint(['created_by_id'], ['user.id'], ),
        sa.ForeignKeyConstraint(['coach_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_event_team_id'), 'event', ['team_id'], unique=False)
    op.create_index(op.f('ix_event_created_by_id'), 'event', ['created_by_id'], unique=False)
    op.create_index(op.f('ix_event_created_at'), 'event', ['created_at'], unique=False)

    # Create event_participant table
    op.create_table(
        'event_participant',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('event_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('athlete_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.Enum('invited', 'confirmed', 'declined', 'maybe', name='participantstatus'), nullable=False),
        sa.Column('invited_at', sa.DateTime(), nullable=False),
        sa.Column('responded_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['event_id'], ['event.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.ForeignKeyConstraint(['athlete_id'], ['athlete.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_event_participant_event_id'), 'event_participant', ['event_id'], unique=False)
    op.create_index(op.f('ix_event_participant_user_id'), 'event_participant', ['user_id'], unique=False)

    # Create notification table
    op.create_table(
        'notification',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('event_id', sa.Integer(), nullable=True),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('channel', sa.String(length=20), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('sent', sa.Boolean(), nullable=False, default=False),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.ForeignKeyConstraint(['event_id'], ['event.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notification_user_id'), 'notification', ['user_id'], unique=False)
    op.create_index(op.f('ix_notification_event_id'), 'notification', ['event_id'], unique=False)
    op.create_index(op.f('ix_notification_created_at'), 'notification', ['created_at'], unique=False)

    # Create push_subscription table
    op.create_table(
        'push_subscription',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('endpoint', sa.Text(), nullable=False),
        sa.Column('p256dh', sa.Text(), nullable=False),
        sa.Column('auth', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_push_subscription_user_id'), 'push_subscription', ['user_id'], unique=True)


def downgrade():
    op.drop_index(op.f('ix_push_subscription_user_id'), table_name='push_subscription')
    op.drop_table('push_subscription')
    
    op.drop_index(op.f('ix_notification_created_at'), table_name='notification')
    op.drop_index(op.f('ix_notification_event_id'), table_name='notification')
    op.drop_index(op.f('ix_notification_user_id'), table_name='notification')
    op.drop_table('notification')
    
    op.drop_index(op.f('ix_event_participant_user_id'), table_name='event_participant')
    op.drop_index(op.f('ix_event_participant_event_id'), table_name='event_participant')
    op.drop_table('event_participant')
    
    op.drop_index(op.f('ix_event_created_at'), table_name='event')
    op.drop_index(op.f('ix_event_created_by_id'), table_name='event')
    op.drop_index(op.f('ix_event_team_id'), table_name='event')
    op.drop_table('event')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS participantstatus')
    op.execute('DROP TYPE IF EXISTS eventstatus')
