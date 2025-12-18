from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from random import choice, randint, uniform
from typing import Optional

from app.core.config import settings
from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import (
    AssessmentSession,  # noqa: F401
    Athlete,
    SessionResult,  # noqa: F401
    Team,
    TeamCombineMetric,
    TestDefinition,  # noqa: F401
    User,
)
from app.models.athlete import (
    AthleteGender,
    AthleteStatus,
    PlayerRegistrationStatus,
    RegistrationCategory,
)
from app.models.report_submission import (
    ReportSubmission,
    ReportSubmissionStatus,
    ReportSubmissionType,
)
from app.models.user import UserRole, UserAthleteApprovalStatus
from app.models.team_combine_metric import CombineMetricStatus


TEST_DEFINITIONS = [
    {
        "name": "Sitting height",
        "category": "Anthropometrics",
        "unit": "cm",
        "target_direction": "higher",
    },
    {
        "name": "Standing height",
        "category": "Anthropometrics",
        "unit": "cm",
        "target_direction": "higher",
    },
    {
        "name": "Weight",
        "category": "Anthropometrics",
        "unit": "kg",
        "target_direction": "lower",
    },
    {
        "name": "10m sprint",
        "category": "Speed",
        "unit": "s",
        "target_direction": "lower",
    },
    {
        "name": "20m sprint",
        "category": "Speed",
        "unit": "s",
        "target_direction": "lower",
    },
    {
        "name": "35m sprint",
        "category": "Speed",
        "unit": "s",
        "target_direction": "lower",
    },
    {
        "name": "YoYo distance",
        "category": "Endurance",
        "unit": "m",
        "target_direction": "higher",
    },
    {"name": "Jump", "category": "Power", "unit": "cm", "target_direction": "higher"},
    {
        "name": "Max shot power",
        "category": "Power",
        "unit": "km/h",
        "target_direction": "higher",
    },
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
    {"name": "U14 B Girls", "age_category": "U14", "description": "U14 2nd Team Girls"},
]

FIRST_NAMES = [
    # Boys
    "Alex",
    "Daniel",
    "Matthew",
    "John",
    "Luke",
    "James",
    "Brian",
    "Ryan",
    "David",
    "Michael",
    "Chris",
    "Kevin",
    "Ethan",
    "Joshua",
    "Andrew",
    "Justin",
    "Samuel",
    "Benjamin",
    "Adam",
    "Nathan",
    "Tyler",
    "Jason",
    "Eric",
    "Aaron",
    # Girls
    "Emily",
    "Sophia",
    "Olivia",
    "Emma",
    "Ava",
    "Isabella",
    "Mia",
    "Charlotte",
    "Amelia",
    "Grace",
    "Ella",
    "Hannah",
    "Abigail",
    "Madison",
    "Chloe",
    "Lily",
    "Samantha",
    "Natalie",
    "Victoria",
    "Brooklyn",
    "Zoe",
    "Layla",
    "Savannah",
    "Avery",
]

LAST_NAMES = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Martinez",
    "Taylor",
    "Clark",
    "Walker",
    "Young",
    "Allen",
    "King",
    "Wright",
    "Scott",
    "Green",
    "Baker",
    "Adams",
    "Nelson",
    "Hill",
    "Ramirez",
    "Campbell",
    "Mitchell",
    "Perez",
    "Roberts",
    "Turner",
    "Phillips",
    "Howard",
    "Parker",
    "Evans",
    "Edwards",
    "Collins",
    "Stewart",
    "Sanchez",
    "Morris",
    "Rogers",
    "Reed",
    "Cook",
    "Morgan",
    "Bell",
    "Murphy",
    "Bailey",
    "Rivera",
    "Cooper",
    "Richardson",
    "Cox",
]


def _random_birth_date(min_age: int = 16, max_age: int = 28) -> date:
    today = date.today()
    age = randint(min_age, max_age)
    return date(today.year - age, randint(1, 12), randint(1, 28))


def _random_birth_date_for_team(age_category: str) -> date:
    today = date.today()
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


def _combine_payload(
    team_id: int, athlete_id: int, recorded_at: datetime
) -> TeamCombineMetric:
    return TeamCombineMetric(
        team_id=team_id,
        athlete_id=athlete_id,
        recorded_at=recorded_at,
        recorded_by_id=1,  # admin (seeded user)
        approved_by_id=1,
        status=CombineMetricStatus.APPROVED,
        sitting_height_cm=_test_value("sitting height"),
        standing_height_cm=_test_value("standing height"),
        weight_kg=_test_value("weight"),
        split_10m_s=_test_value("10m sprint"),
        split_20m_s=_test_value("20m sprint"),
        split_35m_s=_test_value("35m sprint"),
        yoyo_distance_m=_test_value("yoyo distance"),
        jump_cm=_test_value("jump"),
        max_power_kmh=_test_value("max power"),
    )


def create_admin_from_env(session: Session) -> Optional[User]:
    """Idempotent admin bootstrap from env; returns user if created/found."""
    admin_email = (settings.ADMIN_EMAIL or "").strip()
    admin_password = settings.ADMIN_PASSWORD or ""
    if not admin_email or not admin_password:
        return None

    existing = session.exec(
        select(User).where(User.email == admin_email, User.role == UserRole.ADMIN)
    ).first()
    if existing:
        return existing

    admin_name = (settings.ADMIN_NAME or "StatCat Admin").strip()
    admin = User(
        email=admin_email,
        hashed_password=get_password_hash(admin_password),
        full_name=admin_name,
        role=UserRole.ADMIN,
        is_active=True,
        must_change_password=False,
    )
    session.add(admin)
    session.commit()
    session.refresh(admin)
    return admin


def seed_database(session: Session) -> None:
    """Seed básico: bootstrap admin via env (se fornecido) e contas padrão."""
    create_admin_from_env(session)
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


def seed_bulk_teams_and_athletes(
    session: Session,
    team_count: int = 5,
    athletes_per_team: int = 25,
    admin_email: str = "seed_admin@statcat.local",
    admin_password: str = "admin123",
    athlete_password: str = "athlete123",
) -> None:
    """Cria N times com atletas completos, report cards e combine tests."""
    # Evita duplicar se já rodado
    existing = session.exec(select(User).where(User.email == admin_email)).first()
    if existing:
        print("Seed já aplicado: admin encontrado, nada a fazer.")
        return

    now = datetime.now(timezone.utc)

    # Admin
    admin = User(
        email=admin_email,
        hashed_password=get_password_hash(admin_password),
        full_name="Seed Admin",
        role=UserRole.ADMIN,
        is_active=True,
        created_at=now,
    )
    session.add(admin)
    session.flush()

    # Times
    teams: list[Team] = []
    for idx in range(team_count):
        team = Team(
            name=f"Seed Team {idx + 1}",
            age_category="U16",
            description="Seeded team",
            created_by_id=admin.id,
        )
        session.add(team)
        teams.append(team)
    session.flush()

    # Template de categorias de report card
    # Report card categories aligned with frontend radar expectations
    report_categories_template = [
        {
            "name": "Technical Foundation",
            "group_average": 84,
            "metrics": [
                {"name": "Short-Range Saves", "score": 85},
                {"name": "Long-Range Saves", "score": 83},
                {"name": "Distribution", "score": 84},
            ],
        },
        {
            "name": "Mindset",
            "group_average": 82,
            "metrics": [
                {"name": "Leadership", "score": 86},
                {"name": "Composure", "score": 80},
            ],
        },
        {
            "name": "Physicality",
            "group_average": 81,
            "metrics": [
                {"name": "Strength", "score": 82},
                {"name": "Speed", "score": 80},
            ],
        },
    ]

    # Atletas, users, reports e combine metrics
    for t_idx, team in enumerate(teams):
        for a_idx in range(athletes_per_team):
            first_name = f"Athlete{t_idx + 1}_{a_idx + 1}"
            last_name = "Seed"
            email = f"{first_name.lower()}@seed.local"
            birth_date = _random_birth_date_for_team(team.age_category)

            athlete = Athlete(
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone=f"+1-555-{t_idx:02d}{a_idx:02d}",
                birth_date=birth_date,
                gender=AthleteGender.male if (a_idx % 2 == 0) else AthleteGender.female,
                dominant_foot="right" if (a_idx % 2 == 0) else "left",
                height_cm=round(uniform(165, 190), 1),
                weight_kg=round(uniform(55, 90), 1),
                club_affiliation="Seed FC",
                team_id=team.id,
                primary_position=choice(
                    ["Midfielder", "Winger", "Striker", "Goalkeeper"]
                ),
                secondary_position="Full Back",
                photo_url=None,
                status=AthleteStatus.active,
                registration_year=str(now.year),
                registration_category=RegistrationCategory.youth,
                player_registration_status=PlayerRegistrationStatus.new,
                preferred_position="Midfielder",
                desired_shirt_number=str(randint(1, 99)),
            )
            session.add(athlete)
            session.flush()

            # Conta de usuário aprovada para o atleta
            session.add(
                User(
                    email=email,
                    hashed_password=get_password_hash(athlete_password),
                    full_name=f"{first_name} {last_name}",
                    role=UserRole.ATHLETE,
                    athlete_id=athlete.id,
                    athlete_status=UserAthleteApprovalStatus.APPROVED,
                    is_active=True,
                    must_change_password=False,
                    created_at=now,
                )
            )

            # Dois report cards aprovados
            for r_idx in range(2):
                session.add(
                    ReportSubmission(
                        report_type=ReportSubmissionType.REPORT_CARD,
                        status=ReportSubmissionStatus.APPROVED,
                        submitted_by_id=admin.id,
                        approved_by_id=admin.id,
                        approved_at=now - timedelta(days=r_idx + 1),
                        team_id=team.id,
                        athlete_id=athlete.id,
                        coach_report=f"Seed report {r_idx + 1} for {first_name}",
                        general_notes="Seeded report card",
                        report_card_categories=report_categories_template,
                        overall_average=82 + r_idx,
                        created_at=now - timedelta(days=r_idx + 2),
                    )
                )

            # Dois combine tests aprovados
            for days_ago in (3, 12):
                session.add(
                    TeamCombineMetric(
                        team_id=team.id,
                        athlete_id=athlete.id,
                        recorded_by_id=admin.id,
                        approved_by_id=admin.id,
                        status=CombineMetricStatus.APPROVED,
                        recorded_at=now - timedelta(days=days_ago),
                        sitting_height_cm=_test_value("sitting height"),
                        standing_height_cm=_test_value("standing height"),
                        weight_kg=_test_value("weight"),
                        split_10m_s=_test_value("10m sprint"),
                        split_20m_s=_test_value("20m sprint"),
                        split_35m_s=_test_value("35m sprint"),
                        yoyo_distance_m=_test_value("yoyo distance"),
                        jump_cm=_test_value("jump"),
                        max_power_kmh=_test_value("max power"),
                    )
                )

    session.commit()
    print(
        f"Seed concluído: {team_count} times, {team_count * athletes_per_team} atletas."
    )


if __name__ == "__main__":
    # Execução direta: cria times, atletas, report cards e combine tests
    from app.db.session import engine

    with Session(engine) as session:
        seed_bulk_teams_and_athletes(session)
