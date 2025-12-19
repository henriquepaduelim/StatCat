"""add password setup code table

Revision ID: add_password_setup_code_table
Revises: f1b5c3d5ab12
Create Date: 2025-12-19 16:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "add_password_setup_code_table"
down_revision: Union[str, None] = "f1b5c3d5ab12"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "passwordsetupcode",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("code_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    op.create_index("ix_passwordsetupcode_user_id", "passwordsetupcode", ["user_id"])
    op.create_index("ix_passwordsetupcode_expires_at", "passwordsetupcode", ["expires_at"])
    op.create_index("ix_passwordsetupcode_used_at", "passwordsetupcode", ["used_at"])


def downgrade() -> None:
    op.drop_index("ix_passwordsetupcode_used_at", table_name="passwordsetupcode")
    op.drop_index("ix_passwordsetupcode_expires_at", table_name="passwordsetupcode")
    op.drop_index("ix_passwordsetupcode_user_id", table_name="passwordsetupcode")
    op.drop_table("passwordsetupcode")
