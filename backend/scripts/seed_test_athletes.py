"""
Seed utility to create test athletes (and corresponding user records) in bulk.

Usage:
  python scripts/seed_test_athletes.py --count 25 --team-id <optional_team_id>

Notes:
- Creates athletes with athlete_status=PENDING so an admin can approve manually.
- No emails are sent.
"""

import argparse
import logging
from datetime import date

from sqlmodel import Session, select

from app.core.security import get_password_hash
from app.db.session import engine
from app.models.athlete import Athlete
from app.models.user import User, UserRole, UserAthleteApprovalStatus

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def create_test_athletes(count: int, team_id: int | None) -> None:
    with Session(engine) as session:
        created = 0
        for i in range(1, count + 1):
            email = f"test.athlete{i:02d}@statcat.local"
            existing = session.exec(select(User).where(User.email == email)).first()
            if existing:
                logger.info("Skipping existing user %s", email)
                continue

            athlete = Athlete(
                first_name=f"Test{i:02d}",
                last_name="Athlete",
                email=email,
                phone="000-000-0000",
                birth_date=date(2000, 1, 1),
                gender="male",
                team_id=team_id,
                primary_position="Forward",
            )
            session.add(athlete)
            session.flush()

            user = User(
                email=email,
                hashed_password=get_password_hash("Temp123!"),
                full_name=f"Test{i:02d} Athlete",
                role=UserRole.ATHLETE,
                athlete_id=athlete.id,
                athlete_status=UserAthleteApprovalStatus.PENDING,
                is_active=True,
                must_change_password=True,
            )
            session.add(user)
            created += 1

        session.commit()
        logger.info("Created %s test athletes", created)


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed test athletes (pending approval).")
    parser.add_argument("--count", type=int, default=25, help="Number of athletes to create")
    parser.add_argument(
        "--team-id",
        type=int,
        default=None,
        help="Optional team_id to assign to all test athletes",
    )
    args = parser.parse_args()
    create_test_athletes(count=args.count, team_id=args.team_id)


if __name__ == "__main__":
    main()
