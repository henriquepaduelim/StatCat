from __future__ import annotations

import random
from datetime import datetime, timedelta

from sqlmodel import Session, select

from app.db.session import engine
from app.models.athlete import Athlete, AthleteStatus
from app.models.assessment_session import AssessmentSession
from app.models.session_result import SessionResult
from app.models.test_definition import TestDefinition

CLIENT_ID = 2  # Players To Pro Football
ATHLETE_COUNT = 5
SESSIONS_PER_ATHLETE = 5

ATHLETE_NAMES = [
    ("Ava", "Johnson"),
    ("Grace", "Mitchell"),
    ("Harper", "Anderson"),
    ("Chloe", "Walker"),
    ("Madison", "Scott"),
]


def generate_value(test: TestDefinition) -> float:
    name = (test.name or "").lower()
    unit = (test.unit or "").lower()

    if "sprint" in name or unit in {"s", "sec"}:
        return round(random.uniform(3.9, 6.2), 2)
    if "jump" in name or unit in {"cm", "centimeters"}:
        return round(random.uniform(45, 70), 1)
    if unit in {"m", "meters"}:
        return round(random.uniform(10, 40), 1)
    if unit in {"level"}:
        return round(random.uniform(16, 22), 1)
    if unit in {"w", "watts"}:
        return round(random.uniform(3200, 5200), 0)
    if unit in {"kg"}:
        return round(random.uniform(40, 90), 1)
    if unit in {"ms", "millis"}:
        return round(random.uniform(150, 320), 0)
    if unit in {"%"}:
        return round(random.uniform(65, 98), 1)
    if unit in {"bpm"}:
        return round(random.uniform(50, 110), 0)
    if unit in {"pts", "points"}:
        return round(random.uniform(50, 100), 1)
    if unit in {"sec/m"}:
        return round(random.uniform(0.18, 0.32), 3)
    if unit in {"score"}:
        return round(random.uniform(60, 95), 1)

    return round(random.uniform(10, 100), 1)


def main() -> None:
    with Session(engine) as session:
        tests = session.exec(
            select(TestDefinition).where(TestDefinition.client_id == CLIENT_ID)
        ).all()
        if not tests:
            raise RuntimeError("No tests found for client")

        existing_athletes = session.exec(
            select(Athlete).where(Athlete.client_id == CLIENT_ID)
        ).all()
        existing_emails = {a.email for a in existing_athletes if a.email}

        created_athletes: list[Athlete] = []
        base_date = datetime.utcnow()

        for index in range(ATHLETE_COUNT):
            first_name, last_name = ATHLETE_NAMES[index % len(ATHLETE_NAMES)]
            email = f"{first_name.lower()}.{last_name.lower()}{len(existing_athletes)+index}@ptp.dev"
            while email in existing_emails:
                email = email.replace("@", f"{random.randint(1,99)}@")

            athlete = Athlete(
                client_id=CLIENT_ID,
                first_name=first_name,
                last_name=last_name,
                email=email,
                club_affiliation="Players To Pro Football",
                dominant_foot="right" if index % 2 == 0 else "left",
                height_cm=170 + random.uniform(-5, 6),
                weight_kg=65 + random.uniform(-4, 5),
                birth_date=(datetime.utcnow().date().replace(year=2001 + index)),
                status=AthleteStatus.active,
            )
            session.add(athlete)
            session.commit()
            session.refresh(athlete)
            created_athletes.append(athlete)

            for session_index in range(SESSIONS_PER_ATHLETE):
                scheduled_at = base_date - timedelta(days=7 * session_index)
                assessment_session = AssessmentSession(
                    client_id=CLIENT_ID,
                    name=f"Performance Block {session_index + 1}",
                    location="Training Center",
                    scheduled_at=scheduled_at,
                    notes=f"Data capture cycle {session_index + 1} for {athlete.first_name}",
                )
                session.add(assessment_session)
                session.commit()
                session.refresh(assessment_session)

                results = []
                for test in tests:
                    value = generate_value(test)
                    results.append(
                        SessionResult(
                            session_id=assessment_session.id,
                            athlete_id=athlete.id,
                            test_id=test.id,
                            value=value,
                            unit=test.unit,
                        )
                    )
                session.add_all(results)
                session.commit()

        print(f"Created {len(created_athletes)} athletes with {SESSIONS_PER_ATHLETE} sessions each.")


if __name__ == "__main__":
    main()
