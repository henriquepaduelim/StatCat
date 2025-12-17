from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from random import choice, randint, uniform

from sqlmodel import Session, select

from app.core.security import get_password_hash
from app.models import AssessmentSession, Athlete, SessionResult, Team, TeamCombineMetric, TestDefinition, User
from app.models.athlete import AthleteGender, AthleteStatus
from app.models.report_submission import (
    ReportSubmission,
    ReportSubmissionStatus,
    ReportSubmissionType,
)
from app.models.user import UserRole, UserAthleteApprovalStatus


TEST_DEFINITIONS = [
    {"name": "Sitting height", "category": "Anthropometrics", "unit": "cm", "target_direction": "higher"},
    {"name": "Standing height", "category": "Anthropometrics", "unit": "cm", "target_direction": "higher"},
    {"name": "Weight", "category": "Anthropometrics", "unit": "kg", "target_direction": "lower"},
    {"name": "10m sprint", "category": "Speed", "unit": "s", "target_direction": "lower"},
    {"name": "20m sprint", "category": "Speed", "unit": "s", "target_direction": "lower"},
    {"name": "35m sprint", "category": "Speed", "unit": "s", "target_direction": "lower"},
    {"name": "YoYo distance", "category": "Endurance", "unit": "m", "target_direction": "higher"},
    {"name": "Jump", "category": "Power", "unit": "cm", "target_direction": "higher"},
    {"name": "Max shot power", "category": "Power", "unit": "km/h", "target_direction": "higher"},
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
    if "10m" in lower_name:
        return round(uniform(1.65, 1.95), 2)
    if "20m" in lower_name:
        return round(uniform(3.2, 3.8), 2)
    if "35m" in lower_name:
        return round(uniform(5.1, 6.0), 2)
    if "yoyo" in lower_name:
        return round(uniform(800, 1600), 0)
    if "jump" in lower_name:
        return round(uniform(40, 65), 1)
    if "power" in lower_name:
        return round(uniform(90, 140), 1)
    if "sitting" in lower_name:
        return round(uniform(80, 110), 1)
    if "standing" in lower_name:
        return round(uniform(150, 195), 1)
    if "weight" in lower_name:
        return round(uniform(55, 90), 1)
    return round(uniform(1, 100), 2)


def _combine_payload(team_id: int, athlete_id: int, recorded_at: datetime) -> TeamCombineMetric:
    return TeamCombineMetric(
        team_id=team_id,
        athlete_id=athlete_id,
        recorded_at=recorded_at,
        recorded_by_id=1,  # admin (seeded user)
        sitting_height_cm=_test_value("sitting height"),
        standing_height_cm=_test_value("standing hesight"),
        weight_kg=_test_value("weight"),
        split_10m_s=_test_value("10m sprint"),
        split_20m_s=_test_value("20m sprint"),
        split_35m_s=_test_value("35m sprint"),
        yoyo_distance_m=_test_value("yoyo distance"),
        jump_cm=_test_value("jump"),
        max_power_kmh=_test_value("max power"),
    )


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

    # Opcional: criar contas de atleta para testes de login (vinculadas aos dois primeiros atletas)
    athlete_user_payloads = athletes[:2]
    for athlete in athlete_user_payloads:
        session.add(
            User(
                email=athlete.email,
                hashed_password=get_password_hash("athlete123"),
                full_name=f"{athlete.first_name} {athlete.last_name}",
                role=UserRole.ATHLETE,
                athlete_id=athlete.id,
                athlete_status=UserAthleteApprovalStatus.APPROVED,
                is_active=True,
            )
    )
    session.commit()

    # Seed combine metrics to match the UI collection (Testing/New Session)
    for athlete in athletes:
        session.add(
            _combine_payload(
                team_id=athlete.team_id,
                athlete_id=athlete.id,
                recorded_at=datetime.now(timezone.utc) - timedelta(days=3),
            )
        )
        session.add(
            _combine_payload(
                team_id=athlete.team_id,
                athlete_id=athlete.id,
                recorded_at=datetime.now(timezone.utc) - timedelta(days=12),
            )
        )

    # Report cards: 2 por atleta, aprovados
    report_categories_template = [
        {"name": "Technique", "metrics": [{"name": "Passing", "score": 80}, {"name": "Dribbling", "score": 82}]},
        {"name": "Physical", "metrics": [{"name": "Endurance", "score": 78}, {"name": "Speed", "score": 85}]},
    ]
    for athlete in athletes:
        for idx in range(2):
            report = ReportSubmission(
                report_type=ReportSubmissionType.REPORT_CARD,
                status=ReportSubmissionStatus.APPROVED,
                submitted_by_id=coach.id if idx % 2 == 0 else admin.id,
                approved_by_id=admin.id,
                approved_at=datetime.now(timezone.utc),
                team_id=athlete.team_id,
                athlete_id=athlete.id,
                coach_report=f"Report {idx + 1} for {athlete.first_name}",
                general_notes="Seeded report card",
                report_card_categories=report_categories_template,
                overall_average=82 + idx,
                created_at=datetime.now(timezone.utc) - timedelta(days=idx + 1),
            )
            session.add(report)
    session.commit()
