"""Normalize user athlete statuses to uppercase variants.

Revision ID: 202502041230
Revises: 164c04db699d
Create Date: 2025-02-04 23:00:00.000000
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "202502041230"
down_revision: Union[str, None] = "164c04db699d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "UPDATE user SET athlete_status = 'APPROVED' "
        "WHERE athlete_status NOT IN ('APPROVED', 'PENDING', 'REJECTED', 'INCOMPLETE') "
        "AND role != 'athlete'"
    )
    op.execute(
        "UPDATE user SET athlete_status = 'INCOMPLETE' "
        "WHERE athlete_status NOT IN ('APPROVED', 'PENDING', 'REJECTED', 'INCOMPLETE') "
        "AND role = 'athlete'"
    )
    op.execute(
        "UPDATE user SET athlete_status = UPPER(athlete_status) "
        "WHERE athlete_status IN ('approved', 'pending', 'rejected', 'incomplete')"
    )


def downgrade() -> None:
    # No-op; previous lowercase variants are not restored to avoid reintroducing invalid states.
    pass
