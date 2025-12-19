"""Add ON DELETE CASCADE to passwordsetupcode.user_id

Revision ID: b1e19b0db99a
Revises: add_password_setup_code_table
Create Date: 2025-12-20 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "b1e19b0db99a"
down_revision: Union[str, None] = "add_password_setup_code_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("passwordsetupcode") as batch_op:
        batch_op.drop_constraint("passwordsetupcode_user_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "passwordsetupcode_user_id_fkey",
            "user",
            ["user_id"],
            ["id"],
            ondelete="CASCADE",
        )


def downgrade() -> None:
    with op.batch_alter_table("passwordsetupcode") as batch_op:
        batch_op.drop_constraint("passwordsetupcode_user_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "passwordsetupcode_user_id_fkey",
            "user",
            ["user_id"],
            ["id"],
        )
