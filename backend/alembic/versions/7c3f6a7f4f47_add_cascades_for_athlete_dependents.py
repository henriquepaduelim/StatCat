"""Add ON DELETE CASCADE to athlete-dependent foreign keys

Revision ID: 7c3f6a7f4f47
Revises: b1e19b0db99a
Create Date: 2025-12-20 01:00:00.000000
"""

from typing import Iterable, Sequence, Tuple, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = "7c3f6a7f4f47"
down_revision: Union[str, None] = "b1e19b0db99a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _replace_fk(
    table: str,
    local_cols: Tuple[str, ...],
    referred_table: str,
    ondelete: str | None,
) -> None:
    """Drop and recreate an FK for the given columns, preserving the current name."""
    bind = op.get_bind()
    inspector = inspect(bind)
    fks = inspector.get_foreign_keys(table)
    match = None
    for fk in fks:
        if tuple(fk.get("constrained_columns", [])) == local_cols and fk.get(
            "referred_table"
        ) == referred_table:
            match = fk
            break
    if not match:
        raise RuntimeError(
            f"FK not found for {table}.{local_cols} -> {referred_table}. "
            "Schema drift detected."
        )
    fk_name = match["name"]
    with op.batch_alter_table(table) as batch_op:
        batch_op.drop_constraint(fk_name, type_="foreignkey")
        batch_op.create_foreign_key(
            fk_name, referred_table, list(local_cols), ["id"], ondelete=ondelete
        )


def upgrade() -> None:
    cascades: Iterable[Tuple[str, Tuple[str, ...], str]] = (
        ("assessmentsession", ("athlete_id",), "athlete"),
        ("athletedetail", ("athlete_id",), "athlete"),
        ("athletedocument", ("athlete_id",), "athlete"),
        ("athletepayment", ("athlete_id",), "athlete"),
        ("team_combine_metric", ("athlete_id",), "athlete"),
        ("event_participant", ("athlete_id",), "athlete"),
        ("group_membership", ("athlete_id",), "athlete"),
        ("match_stat", ("athlete_id",), "athlete"),
        ("sessionresult", ("athlete_id",), "athlete"),
    )
    for table, cols, ref in cascades:
        _replace_fk(table, cols, ref, ondelete="CASCADE")

    user_cascades: Iterable[Tuple[str, Tuple[str, ...], str]] = (
        ("coachteamlink", ("user_id",), "user"),
        ("event_participant", ("user_id",), "user"),
        ("push_subscription", ("user_id",), "user"),
        ("notification", ("user_id",), "user"),
    )
    for table, cols, ref in user_cascades:
        _replace_fk(table, cols, ref, ondelete="CASCADE")


def downgrade() -> None:
    cascades: Iterable[Tuple[str, Tuple[str, ...], str]] = (
        ("assessmentsession", ("athlete_id",), "athlete"),
        ("athletedetail", ("athlete_id",), "athlete"),
        ("athletedocument", ("athlete_id",), "athlete"),
        ("athletepayment", ("athlete_id",), "athlete"),
        ("team_combine_metric", ("athlete_id",), "athlete"),
        ("event_participant", ("athlete_id",), "athlete"),
        ("group_membership", ("athlete_id",), "athlete"),
        ("match_stat", ("athlete_id",), "athlete"),
        ("sessionresult", ("athlete_id",), "athlete"),
    )
    for table, cols, ref in cascades:
        _replace_fk(table, cols, ref, ondelete=None)

    user_cascades: Iterable[Tuple[str, Tuple[str, ...], str]] = (
        ("coachteamlink", ("user_id",), "user"),
        ("event_participant", ("user_id",), "user"),
        ("push_subscription", ("user_id",), "user"),
        ("notification", ("user_id",), "user"),
    )
    for table, cols, ref in user_cascades:
        _replace_fk(table, cols, ref, ondelete=None)
