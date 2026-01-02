"""Backfill event_team_link from legacy event.team_id

Revision ID: f4a45ed8c0af
Revises: 07fad273aefc
Create Date: 2025-01-05 15:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "f4a45ed8c0af"
down_revision: Union[str, Sequence[str], None] = "07fad273aefc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Ensure every event.team_id has a matching EventTeamLink row."""
    conn = op.get_bind()
    result = conn.execute(
        sa.text("SELECT id, team_id FROM event WHERE team_id IS NOT NULL")
    ).fetchall()
    for event_id, team_id in result:
        exists = conn.execute(
            sa.text(
                "SELECT 1 FROM event_team_link WHERE event_id = :event_id AND team_id = :team_id"
            ),
            {"event_id": event_id, "team_id": team_id},
        ).first()
        if exists:
            continue
        conn.execute(
            sa.text(
                "INSERT INTO event_team_link (event_id, team_id) VALUES (:event_id, :team_id)"
            ),
            {"event_id": event_id, "team_id": team_id},
        )


def downgrade() -> None:
    """No-op downgrade (data backfill only)."""
    pass
