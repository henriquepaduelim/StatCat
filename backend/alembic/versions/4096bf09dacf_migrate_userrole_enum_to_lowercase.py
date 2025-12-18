"""migrate userrole enum to lowercase

Revision ID: 4096bf09dacf
Revises: 07fad273aefc
Create Date: 2025-12-17 00:37:38.347876

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa  # noqa: F401


# revision identifiers, used by Alembic.
revision: str = "4096bf09dacf"
down_revision: Union[str, Sequence[str], None] = "07fad273aefc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to lowercase user roles."""

    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        # SQLite stores enums as CHECK constraints; skip type recreation
        return

    # Create new enum with lowercase values
    op.execute(
        "CREATE TYPE userrole_new AS ENUM ('athlete', 'coach', 'staff', 'admin')"
    )

    # Drop default (if any), convert values to lowercase, and switch to the new enum
    op.execute('ALTER TABLE "user" ALTER COLUMN role DROP DEFAULT')
    op.execute(
        'ALTER TABLE "user" ALTER COLUMN role TYPE userrole_new USING lower(role::text)::userrole_new'
    )

    # Replace old enum with the new one
    op.execute("DROP TYPE userrole")
    op.execute("ALTER TYPE userrole_new RENAME TO userrole")


def downgrade() -> None:
    """Revert to uppercase user roles."""

    op.execute(
        "CREATE TYPE userrole_old AS ENUM ('ATHLETE', 'COACH', 'STAFF', 'ADMIN')"
    )
    op.execute('ALTER TABLE "user" ALTER COLUMN role DROP DEFAULT')
    op.execute(
        'ALTER TABLE "user" ALTER COLUMN role TYPE userrole_old USING upper(role::text)::userrole_old'
    )
    op.execute("DROP TYPE userrole")
    op.execute("ALTER TYPE userrole_old RENAME TO userrole")
