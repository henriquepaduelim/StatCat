from __future__ import annotations

from datetime import date, datetime, timedelta
from random import choice, randint, uniform

from sqlmodel import Session, select

from app.core.security import get_password_hash
from app.models import AssessmentSession, Athlete, SessionResult, Team, TestDefinition, User
from app.models.athlete import AthleteGender, AthleteStatus
from app.models.user import UserRole


TEST_DEFINITIONS = [
    {"name": "10 m Sprint", "category": "Speed", "unit": "s", "target_direction": "lower"},
    {"name": "30 m Sprint", "category": "Speed", "unit": "s", "target_direction": "lower"},
    {"name": "Vertical Jump", "category": "Power", "unit": "cm", "target_direction": "higher"},
    {"name": "Beep Test", "category": "Endurance", "unit": "level", "target_direction": "higher"},
]

TEAM_BLUEPRINTS = [
    {"name": "U16 A Boys", "age_category": "U16", "description": "U16 Boys 1st Team"},
    {"name": "U16 B Boys", "age_category": "U16", "description": "U16 Boys 2nd Team"},
    {"name": "U16 A Girls", "age_category": "U16", "description": "U16 Girls 1st Team"},
    {"name": "U16 B Girls", "age_category": "U16", "description": "U16 Girls 2nd Team"},
    {"name": "U15 A Boys", "age_category": "U15", "description": "U15 Boys 1st Team"},
    {"name": "U15 B Boys", "age_category": "U15", "description": "U15 Boys 2nd Team"},
    {"name": "U15 A Girls", "age_category": "U15", "description": "U15 Girls 1st Team"},
    {"name": "U15 B Girls", "age_category": "U15", "description": "U15 Girls 2nd Team"},
    {"name": "U14 A Boys", "age_category": "U14", "description": "U14 1st Team Boys"},
    {"name": "U14 B Boys", "age_category": "U14", "description": "U14 2nd Team Boys"},
    {"name": "U14 A Girls", "age_category": "U14", "description": "U14 1st Team Girls"},
    {"name": "U14 B Girls", "age_category": "U14", "description": "U14 2nd Team Girls"}
]

FIRST_NAMES = [
    # Boys
    "Alex", "Daniel", "Matthew", "John", "Luke", "James", "Brian", "Ryan", "David", "Michael", "Chris", "Kevin",
    "Ethan", "Joshua", "Andrew", "Justin", "Samuel", "Benjamin", "Adam", "Nathan", "Tyler", "Jason", "Eric", "Aaron",
    # Girls
    "Emily", "Sophia", "Olivia", "Emma", "Ava", "Isabella", "Mia", "Charlotte", "Amelia", "Grace", "Ella", "Hannah",
    "Abigail", "Madison", "Chloe", "Lily", "Samantha", "Natalie", "Victoria", "Brooklyn", "Zoe", "Layla", "Savannah", "Avery",
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Martinez", "Taylor", "Clark", "Walker",
    "Young", "Allen", "King", "Wright", "Scott", "Green", "Baker", "AdAMS", "Nelson", "Hill", "Ramirez", "Campbell",
    "Mitchell", "Perez", "Roberts", "Turner", "Phillips", "Howard", "Parker", "EvANS", "Edwards", "Collins", "Stewart",
    "Sanchez", "Morris", "Rogers", "Reed", "Cook", "Morgan", "Bell", "Murphy", "Bailey", "Rivera", "Cooper", "Richardson", "Cox"
]


def _random_birth_date(min_age: int = 16, max_age: int = 28) -> date:
    today = date.today()
    age = randint(min_age, max_age)
    return date(today.year - age, randint(1, 12), randint(1, 28))


def _random_birth_date_for_team(age_category: str) -> date:
    today = date.today()
    # Map team age category to age range
    age_map = {
        "U14": (12, 13),
        "U15": (13, 14),
        "U16": (14, 15),
       
    }
    min_age, max_age = age_map.get(age_category, (14, 19))
    age = randint(min_age, max_age)
    return date(today.year - age, randint(1, 12), randint(1, 28))


def _test_value(test_name: str) -> float:
    lower_name = test_name.lower()
    if "10 m" in lower_name:
        return round(uniform(1.65, 1.95), 2)
    if "30 m" in lower_name:
        return round(uniform(3.9, 4.5), 2)
    if "vertical" in lower_name:
        return round(uniform(45, 68), 1)
    if "beep" in lower_name:
        return round(uniform(9.0, 13.2), 1)
    return round(uniform(1, 100), 2)


def seed_database(session: Session) -> None:
    if session.exec(select(User.id)).first():
        return

    admin = User(
        email="admin@combine.local",
        hashed_password=get_password_hash("admin123"),
        full_name="Combine Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    staff = User(
        email="staff@combine.local",
        hashed_password=get_password_hash("staff123"),
        full_name="Staff Operator",
        role=UserRole.STAFF,
        is_active=True,
    )
    coach = User(
        email="coach@combine.local",
        hashed_password=get_password_hash("coach123"),
        full_name="Head Coach",
        role=UserRole.COACH,
        is_active=True,
    )
    session.add_all([admin, staff, coach])
    session.commit()

    teams: list[Team] = []
    for blueprint in TEAM_BLUEPRINTS:
        team = Team(
            name=blueprint["name"],
            age_category=blueprint["age_category"],
            description=blueprint["description"],
            created_by_id=admin.id,
        )
        session.add(team)
        teams.append(team)
    session.commit()

    tests: list[TestDefinition] = []
    for payload in TEST_DEFINITIONS:
        definition = TestDefinition(**payload)
        session.add(definition)
        tests.append(definition)
    session.commit()

    athletes: list[Athlete] = []
    for index in range(len(FIRST_NAMES)):
        team = teams[index % len(teams)]
        birth_date = _random_birth_date_for_team(team.age_category)
        athlete = Athlete(
            first_name=FIRST_NAMES[index],
            last_name=LAST_NAMES[index],
            email=f"{FIRST_NAMES[index].lower()}.{LAST_NAMES[index].lower()}@combine.local",
            phone=f"+1-555-01{index:02d}",
            birth_date=birth_date,
            gender=AthleteGender.male if index % 2 == 0 else AthleteGender.female,
            height_cm=round(uniform(160, 195), 1),
            weight_kg=round(uniform(55, 92), 1),
            primary_position=choice([
                "Goalkeeper", "Center Back", "Full Back", "Midfielder", "Winger", "Striker"
            ]),
            team_id=team.id,
            status=AthleteStatus.active,
        )
        session.add(athlete)
        athletes.append(athlete)
    session.commit()

    assessments: list[AssessmentSession] = []
    base_date = datetime.utcnow()
    for offset, name in zip([28, 21, 14, 7], ["Foundation", "Acceleration", "Power", "Match Prep"]):
        assessment = AssessmentSession(
            name=f"{name} Block",
            scheduled_at=base_date - timedelta(days=offset),
            location="Training Center",
        )
        session.add(assessment)
        assessments.append(assessment)
    session.commit()

    for assessment in assessments:
        for athlete in athletes:
            for definition in tests:
                session.add(
                    SessionResult(
                        session_id=assessment.id,
                        athlete_id=athlete.id,
                        test_id=definition.id,
                        value=_test_value(definition.name),
                        unit=definition.unit,
                    )
                )
    session.commit()
