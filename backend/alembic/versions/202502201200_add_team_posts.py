"""Add team_post table for team discussions.

Revision ID: 202502201200
Revises: 202502041230
Create Date: 2025-02-20 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "202502201200"
down_revision: Union[str, None] = "202502041230"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "team_post",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.String(length=2000), nullable=False),
        sa.Column("media_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["team_id"], ["team.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["author_id"], ["user.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_team_post_team_id", "team_post", ["team_id"])
    op.create_index("ix_team_post_author_id", "team_post", ["author_id"])
    op.create_index("ix_team_post_created_at", "team_post", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_team_post_created_at", table_name="team_post")
    op.drop_index("ix_team_post_author_id", table_name="team_post")
    op.drop_index("ix_team_post_team_id", table_name="team_post")
    op.drop_table("team_post")
