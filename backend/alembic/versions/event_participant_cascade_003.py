"""ensure event_participant rows cascade on event delete

Revision ID: event_participant_cascade_003
Revises: make_user_id_nullable_002
Create Date: 2025-01-10 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "event_participant_cascade_003"
down_revision = "make_user_id_nullable_002"
branch_labels = None
depends_on = None


def _table_exists(inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _drop_index_if_exists(inspector, table_name: str, index_name: str) -> None:
    indexes = inspector.get_indexes(table_name)
    if any(index["name"] == index_name for index in indexes):
        op.drop_index(index_name, table_name=table_name)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _table_exists(inspector, "event_participant"):
        return

    idx_event = op.f("ix_event_participant_event_id")
    idx_user = op.f("ix_event_participant_user_id")

    _drop_index_if_exists(inspector, "event_participant", idx_event)
    _drop_index_if_exists(inspector, "event_participant", idx_user)

    op.rename_table("event_participant", "event_participant_old")

    participant_status_enum = sa.Enum(
        "invited",
        "confirmed",
        "declined",
        "maybe",
        name="participantstatus",
        create_type=False,
    )

    op.create_table(
        "event_participant",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column(
            "event_id",
            sa.Integer(),
            sa.ForeignKey("event.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=True),
        sa.Column("athlete_id", sa.Integer(), sa.ForeignKey("athlete.id"), nullable=True),
        sa.Column("status", participant_status_enum, nullable=False),
        sa.Column("invited_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("responded_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(idx_event, "event_participant", ["event_id"], unique=False)
    op.create_index(idx_user, "event_participant", ["user_id"], unique=False)

    bind.execute(
        sa.text(
            """
            INSERT INTO event_participant (id, event_id, user_id, athlete_id, status, invited_at, responded_at)
            SELECT id, event_id, user_id, athlete_id, status, invited_at, responded_at
            FROM event_participant_old
            """
        )
    )

    op.drop_table("event_participant_old")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _table_exists(inspector, "event_participant"):
        return

    idx_event = op.f("ix_event_participant_event_id")
    idx_user = op.f("ix_event_participant_user_id")

    _drop_index_if_exists(inspector, "event_participant", idx_event)
    _drop_index_if_exists(inspector, "event_participant", idx_user)

    op.rename_table("event_participant", "event_participant_new")

    participant_status_enum = sa.Enum(
        "invited",
        "confirmed",
        "declined",
        "maybe",
        name="participantstatus",
        create_type=False,
    )

    op.create_table(
        "event_participant",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("event.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=True),
        sa.Column("athlete_id", sa.Integer(), sa.ForeignKey("athlete.id"), nullable=True),
        sa.Column("status", participant_status_enum, nullable=False),
        sa.Column("invited_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("responded_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(idx_event, "event_participant", ["event_id"], unique=False)
    op.create_index(idx_user, "event_participant", ["user_id"], unique=False)

    bind.execute(
        sa.text(
            """
            INSERT INTO event_participant (id, event_id, user_id, athlete_id, status, invited_at, responded_at)
            SELECT id, event_id, user_id, athlete_id, status, invited_at, responded_at
            FROM event_participant_new
            """
        )
    )

    op.drop_table("event_participant_new")
