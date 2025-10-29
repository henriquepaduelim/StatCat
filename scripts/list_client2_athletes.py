from sqlmodel import Session, select

from app.db.session import engine
from app.models.athlete import Athlete

with Session(engine) as session:
    rows = session.exec(select(Athlete).where(Athlete.client_id == 2)).all()
    for athlete in rows:
        print(athlete.id, athlete.first_name, athlete.last_name, athlete.email)
