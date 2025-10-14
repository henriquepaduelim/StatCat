from sqlmodel import Session, select

from app.db.session import engine
from app.models.athlete import Athlete

CLIENT_ID = 2
NEW_NAMES = [
    ("Ava", "Johnson"),
    ("Grace", "Mitchell"),
    ("Harper", "Anderson"),
    ("Chloe", "Walker"),
    ("Madison", "Scott"),
]


def main() -> None:
    with Session(engine) as session:
        statement = (
            select(Athlete)
            .where(Athlete.client_id == CLIENT_ID)
            .where(Athlete.email.like("%@ptp.dev"))
            .order_by(Athlete.id)
        )
        athletes = session.exec(statement).all()
        if len(athletes) != len(NEW_NAMES):
            print(
                f"Expected {len(NEW_NAMES)} demo athletes, found {len(athletes)}. Aborting rename."
            )
            return

        for athlete, (first, last) in zip(athletes, NEW_NAMES):
            athlete.first_name = first
            athlete.last_name = last
            athlete.email = f"{first.lower()}.{last.lower()}@ptp.dev"
            session.add(athlete)

        session.commit()
        print("Updated demo athlete names to English variants.")


if __name__ == "__main__":
    main()
