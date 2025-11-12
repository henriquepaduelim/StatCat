"""track explicit event-to-team associations

Revision ID: event_team_link_004
Revises: event_participant_cascade_003
Create Date: 2025-02-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "event_team_link_004"
down_revision = "event_participant_cascade_003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "event_team_link",
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["event.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_id"], ["team.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("event_id", "team_id"),
    )

    connection = op.get_bind()
    event_table = sa.table(
        "event",
        sa.column("id", sa.Integer),
        sa.column("team_id", sa.Integer),
    )
    link_table = sa.table(
        "event_team_link",
        sa.column("event_id", sa.Integer),
        sa.column("team_id", sa.Integer),
    )

    rows = connection.execute(
        sa.select(event_table.c.id, event_table.c.team_id).where(event_table.c.team_id.isnot(None))
    ).all()

    seed_rows = [
        {"event_id": event_id, "team_id": team_id}
        for event_id, team_id in rows
        if team_id is not None
    ]
    if seed_rows:
        connection.execute(sa.insert(link_table), seed_rows)


def downgrade() -> None:
    op.drop_table("event_team_link")
