"""normalize remaining enums

Revision ID: 813b8a6cf1c4
Revises: 4096bf09dacf
Create Date: 2025-12-17 00:54:07.697756

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '813b8a6cf1c4'
down_revision: Union[str, Sequence[str], None] = '4096bf09dacf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to use lowercase enum values matching the models."""

    # userathleteapprovalstatus -> lowercase
    op.execute("CREATE TYPE userathleteapprovalstatus_new AS ENUM ('pending', 'approved', 'rejected', 'incomplete')")
    op.execute('ALTER TABLE "user" ALTER COLUMN athlete_status TYPE userathleteapprovalstatus_new USING lower(athlete_status::text)::userathleteapprovalstatus_new')
    op.execute("DROP TYPE userathleteapprovalstatus")
    op.execute("ALTER TYPE userathleteapprovalstatus_new RENAME TO userathleteapprovalstatus")

    # participantstatus -> lowercase
    op.execute("CREATE TYPE participantstatus_new AS ENUM ('invited', 'confirmed', 'declined', 'maybe')")
    op.execute('ALTER TABLE event_participant ALTER COLUMN status DROP DEFAULT')
    op.execute('ALTER TABLE event_participant ALTER COLUMN status TYPE participantstatus_new USING lower(status::text)::participantstatus_new')
    op.execute("DROP TYPE participantstatus")
    op.execute("ALTER TYPE participantstatus_new RENAME TO participantstatus")

    # reportsubmissionstatus -> lowercase
    op.execute("CREATE TYPE reportsubmissionstatus_new AS ENUM ('pending', 'approved', 'rejected')")
    op.execute('ALTER TABLE report_submission ALTER COLUMN status DROP DEFAULT')
    op.execute('ALTER TABLE report_submission ALTER COLUMN status TYPE reportsubmissionstatus_new USING lower(status::text)::reportsubmissionstatus_new')
    op.execute("DROP TYPE reportsubmissionstatus")
    op.execute("ALTER TYPE reportsubmissionstatus_new RENAME TO reportsubmissionstatus")

    # combinemetricstatus -> lowercase
    op.execute("CREATE TYPE combinemetricstatus_new AS ENUM ('pending', 'approved', 'rejected')")
    op.execute('ALTER TABLE team_combine_metric ALTER COLUMN status DROP DEFAULT')
    op.execute('ALTER TABLE team_combine_metric ALTER COLUMN status TYPE combinemetricstatus_new USING lower(status::text)::combinemetricstatus_new')
    op.execute("DROP TYPE combinemetricstatus")
    op.execute("ALTER TYPE combinemetricstatus_new RENAME TO combinemetricstatus")

    # reportsubmissiontype -> new lowercase values
    op.execute("CREATE TYPE reportsubmissiontype_new AS ENUM ('injury', 'wellness')")
    op.execute('ALTER TABLE report_submission ALTER COLUMN report_type DROP DEFAULT')
    op.execute(
        """
        ALTER TABLE report_submission
        ALTER COLUMN report_type
        TYPE reportsubmissiontype_new
        USING CASE
            WHEN lower(report_type::text) IN ('injury','wellness')
                THEN lower(report_type::text)::reportsubmissiontype_new
            ELSE NULL
        END
        """
    )
    op.execute("DROP TYPE reportsubmissiontype")
    op.execute("ALTER TYPE reportsubmissiontype_new RENAME TO reportsubmissiontype")


def downgrade() -> None:
    """Revert enums to their previous uppercase values."""

    # reportsubmissiontype back to uppercase (GAME/REPORT_CARD). Values not in this set become NULL.
    op.execute("CREATE TYPE reportsubmissiontype_old AS ENUM ('GAME', 'REPORT_CARD')")
    op.execute('ALTER TABLE report_submission ALTER COLUMN report_type DROP DEFAULT')
    op.execute(
        """
        ALTER TABLE report_submission
        ALTER COLUMN report_type
        TYPE reportsubmissiontype_old
        USING CASE
            WHEN upper(report_type::text) IN ('GAME','REPORT_CARD')
                THEN upper(report_type::text)::reportsubmissiontype_old
            ELSE NULL
        END
        """
    )
    op.execute("DROP TYPE reportsubmissiontype")
    op.execute("ALTER TYPE reportsubmissiontype_old RENAME TO reportsubmissiontype")

    # combinemetricstatus back to uppercase
    op.execute("CREATE TYPE combinemetricstatus_old AS ENUM ('PENDING', 'APPROVED', 'REJECTED')")
    op.execute('ALTER TABLE team_combine_metric ALTER COLUMN status DROP DEFAULT')
    op.execute('ALTER TABLE team_combine_metric ALTER COLUMN status TYPE combinemetricstatus_old USING upper(status::text)::combinemetricstatus_old')
    op.execute("DROP TYPE combinemetricstatus")
    op.execute("ALTER TYPE combinemetricstatus_old RENAME TO combinemetricstatus")

    # reportsubmissionstatus back to uppercase
    op.execute("CREATE TYPE reportsubmissionstatus_old AS ENUM ('PENDING', 'APPROVED', 'REJECTED')")
    op.execute('ALTER TABLE report_submission ALTER COLUMN status DROP DEFAULT')
    op.execute('ALTER TABLE report_submission ALTER COLUMN status TYPE reportsubmissionstatus_old USING upper(status::text)::reportsubmissionstatus_old')
    op.execute("DROP TYPE reportsubmissionstatus")
    op.execute("ALTER TYPE reportsubmissionstatus_old RENAME TO reportsubmissionstatus")

    # participantstatus back to uppercase
    op.execute("CREATE TYPE participantstatus_old AS ENUM ('INVITED', 'CONFIRMED', 'DECLINED', 'MAYBE')")
    op.execute('ALTER TABLE event_participant ALTER COLUMN status DROP DEFAULT')
    op.execute('ALTER TABLE event_participant ALTER COLUMN status TYPE participantstatus_old USING upper(status::text)::participantstatus_old')
    op.execute("DROP TYPE participantstatus")
    op.execute("ALTER TYPE participantstatus_old RENAME TO participantstatus")

    # userathleteapprovalstatus back to uppercase
    op.execute("CREATE TYPE userathleteapprovalstatus_old AS ENUM ('INCOMPLETE', 'PENDING', 'APPROVED', 'REJECTED')")
    op.execute('ALTER TABLE "user" ALTER COLUMN athlete_status TYPE userathleteapprovalstatus_old USING upper(athlete_status::text)::userathleteapprovalstatus_old')
    op.execute("DROP TYPE userathleteapprovalstatus")
    op.execute("ALTER TYPE userathleteapprovalstatus_old RENAME TO userathleteapprovalstatus")
