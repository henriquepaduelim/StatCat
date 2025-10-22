from __future__ import annotations

from datetime import datetime, timedelta
from random import randint, uniform

from sqlmodel import Session, delete, select

from app.core.security import get_password_hash
from app.models import (
    AssessmentSession,
    Athlete,
    Client,
    MatchStat,
    SessionResult,
    Team,
    TestDefinition,
    User,
)
from app.models.athlete import AthleteGender, AthleteStatus
from app.services.testing_sheet_loader import (
    infer_target_direction,
    load_testing_sheet,
)


def seed_ptp_rich_data(session: Session, clients: list[Client]):
    """
    Creates a rich and realistic dataset for the 'Players To Pro' client,
    wiping any previous data for this client first.
    """
    print("--- Starting rich seeding for Players To Pro... ---")
    ptp_client = next((c for c in clients if c.name == "Players To Pro Football"), None)
    if not ptp_client:
        print("--- ERROR: Client 'Players To Pro Football' not found. ---")
        return

    # 1) DELETE OLD PTP DATA TO GUARANTEE A CLEAN RE-CREATION
    print(f"--- Deleting old data for client ID: {ptp_client.id}... ---")
    # Find existing athletes to delete their results first
    stmt_athletes = select(Athlete).where(Athlete.client_id == ptp_client.id)
    athletes_to_delete = session.exec(stmt_athletes).all()
    if athletes_to_delete:
        athlete_ids = [a.id for a in athletes_to_delete]
        # Delete results
        stmt_delete_results = delete(SessionResult).where(SessionResult.athlete_id.in_(athlete_ids))
        session.exec(stmt_delete_results)
        # Delete athletes
        stmt_delete_athletes = delete(Athlete).where(Athlete.id.in_(athlete_ids))
        session.exec(stmt_delete_athletes)

    # Delete old test definitions and assessment sessions
    session.exec(delete(TestDefinition).where(TestDefinition.client_id == ptp_client.id))
    session.exec(delete(AssessmentSession).where(AssessmentSession.client_id == ptp_client.id))
    session.commit()
    print("--- Previous PTP data deleted successfully. ---")

    def build_description(age_groups: tuple[str, ...], benchmark: str | None, notes: str | None) -> str | None:
        parts: list[str] = []
        if age_groups:
            parts.append(f"Available for: {', '.join(age_groups)}")
        if benchmark:
            parts.append(f"Benchmark: {benchmark}")
        if notes:
            parts.append(notes)
        return "\n".join(parts) if parts else None

    def infer_unit(benchmark: str | None) -> str:
        if not benchmark:
            return ""
        lowered = benchmark.lower()
        if "sec" in lowered or "s" in lowered.split():
            return "s"
        if "mph" in lowered:
            return "mph"
        if "km/h" in lowered:
            return "km/h"
        if "cm" in lowered:
            return "cm"
        return ""

    sheet_entries = load_testing_sheet()
    tests = [
        TestDefinition(
            client_id=ptp_client.id,
            name=entry.name,
            category=entry.category,
            unit=infer_unit(entry.benchmark),
            description=build_description(entry.age_groups, entry.benchmark, entry.notes),
            target_direction=infer_target_direction(entry.name),
        )
        for entry in sheet_entries
    ]
    session.add_all(tests)
    session.commit()
    test_map = {test.name: test.id for test in tests}

    livia_ferraz = Athlete(
        client_id=ptp_client.id,
        first_name="Livia",
        last_name="Ferraz",
        email="livia.ferraz@ptp.dev",
        club_affiliation="Players To Pro Football",
        dominant_foot="right",
        height_cm=171,
        weight_kg=62,
        birth_date=datetime(2001, 5, 22).date(),
        status=AthleteStatus.active,
        gender=AthleteGender.female,
    )
    session.add(livia_ferraz)
    session.commit()

    sessoes_livia = [
        AssessmentSession(client_id=ptp_client.id, name="Weekly Assessment 1",
                          scheduled_at=datetime.utcnow() - timedelta(days=28)),
        AssessmentSession(client_id=ptp_client.id, name="Weekly Assessment 2",
                          scheduled_at=datetime.utcnow() - timedelta(days=21)),
        AssessmentSession(client_id=ptp_client.id, name="Weekly Assessment 3",
                          scheduled_at=datetime.utcnow() - timedelta(days=14)),
        AssessmentSession(client_id=ptp_client.id, name="Weekly Assessment 4",
                          scheduled_at=datetime.utcnow() - timedelta(days=7)),
        AssessmentSession(client_id=ptp_client.id, name="Pre-Game Assessment",
                          scheduled_at=datetime.utcnow() - timedelta(days=1)),
    ]
    session.add_all(sessoes_livia)
    session.commit()

    resultados_por_dia = [
        [
            {"test_name": "Resting Heart Rate (Seated)", "value": 49},
            {"test_name": "20 m Slalom with Ball", "value": 7.3},
            {"test_name": "Shot Power (Run-Up, Right Foot)", "value": 118},
            {"test_name": "Shot Power (Run-Up, Left Foot)", "value": 110},
            {"test_name": "10 m Sprint", "value": 1.72},
            {"test_name": "30 m Sprint", "value": 4.45},
            {"test_name": "Vertical Jump (No Run-Up)", "value": 56},
            {"test_name": "Plank (Max Time)", "value": 150},
            {"test_name": "Beep Test", "value": 11.0},
        ],
        [
            {"test_name": "Resting Heart Rate (Seated)", "value": 48},
            {"test_name": "20 m Slalom with Ball", "value": 7.12},
            {"test_name": "Shot Power (Run-Up, Right Foot)", "value": 121},
            {"test_name": "Shot Power (Run-Up, Left Foot)", "value": 112},
            {"test_name": "10 m Sprint", "value": 1.68},
            {"test_name": "30 m Sprint", "value": 4.38},
            {"test_name": "Vertical Jump (No Run-Up)", "value": 57},
            {"test_name": "Plank (Max Time)", "value": 160},
            {"test_name": "Beep Test", "value": 11.4},
        ],
        [
            {"test_name": "Resting Heart Rate (Seated)", "value": 47},
            {"test_name": "20 m Slalom with Ball", "value": 7.05},
            {"test_name": "Shot Power (Run-Up, Right Foot)", "value": 123},
            {"test_name": "Shot Power (Run-Up, Left Foot)", "value": 114},
            {"test_name": "10 m Sprint", "value": 1.66},
            {"test_name": "30 m Sprint", "value": 4.35},
            {"test_name": "Vertical Jump (No Run-Up)", "value": 58},
            {"test_name": "Plank (Max Time)", "value": 170},
            {"test_name": "Beep Test", "value": 11.8},
        ],
        [
            {"test_name": "Resting Heart Rate (Seated)", "value": 47},
            {"test_name": "20 m Slalom with Ball", "value": 6.98},
            {"test_name": "Shot Power (Run-Up, Right Foot)", "value": 125},
            {"test_name": "Shot Power (Run-Up, Left Foot)", "value": 115},
            {"test_name": "10 m Sprint", "value": 1.65},
            {"test_name": "30 m Sprint", "value": 4.31},
            {"test_name": "Vertical Jump (No Run-Up)", "value": 59},
            {"test_name": "Plank (Max Time)", "value": 185},
            {"test_name": "Beep Test", "value": 12.2},
        ],
        [
            {"test_name": "Resting Heart Rate (Seated)", "value": 46},
            {"test_name": "20 m Slalom with Ball", "value": 6.95},
            {"test_name": "Shot Power (Run-Up, Right Foot)", "value": 127},
            {"test_name": "Shot Power (Run-Up, Left Foot)", "value": 117},
            {"test_name": "10 m Sprint", "value": 1.63},
            {"test_name": "30 m Sprint", "value": 4.28},
            {"test_name": "Vertical Jump (No Run-Up)", "value": 60},
            {"test_name": "Plank (Max Time)", "value": 195},
            {"test_name": "Beep Test", "value": 12.6},
        ],
    ]

    for i, dia_de_resultados in enumerate(resultados_por_dia):
        resultados_para_salvar = []
        for resultado in dia_de_resultados:
            test_id = test_map.get(resultado["test_name"])
            if test_id is None:
                continue
            resultados_para_salvar.append(
                SessionResult(
                    session_id=sessoes_livia[i].id,
                    athlete_id=livia_ferraz.id,
                    test_id=test_id,
                    value=resultado["value"],
                )
            )
        session.add_all(resultados_para_salvar)

    session.commit()
    print("--- Rich data for PTP created successfully. ---")

def seed_database(session: Session) -> None:
    if session.exec(select(Client.id)).first():
        # Database already seeded; avoid resetting custom data.
        return

    clients_data = [
        {
            "name": "MVP Sports Analytics",
            "slug": "MVP Sports",
            "description": "Fitness Analysis",
            "primary_color": "#000000",
            "accent_color": "#00FF40",
            "background_color": "#F1F5F9",
            "surface_color": "#BBFFBD",
            "muted_color": "#B7C0CD",
            "on_primary_color": "#FFFFFF",
            "on_surface_color": "#000000",
            "logo_label": "MVP Sports Analytics",
            "logo_background_color": "#DCE5F3",
            "logo_text_color": "#000000",
        },
        {
            "name": "Players To Pro Football",
            "slug": "PTP Football",
            "description": "Tradition and high performance",
            "primary_color": "#2191FB",
            "accent_color": "#C3E1FE",
            "background_color": "#F3F9FF",
            "surface_color": "#C3E1FE",
            "muted_color": "#000000",
            "on_primary_color": "#000000",
            "on_surface_color": "#000000",
            "logo_label": "PTP Football",
            "logo_background_color": "#000000",
            "logo_text_color": "#FFFFFF",
        },
        {
            "name": "Urban Fut",
            "slug": "urban-fut",
            "description": "Urban athlete academy",
            "primary_color": "#2D3748",
            "accent_color": "#06B6D4",
            "background_color": "#F3F4FF",
            "surface_color": "#FFFFFF",
            "muted_color": "#581C87",
            "on_primary_color": "#FFFFFF",
            "on_surface_color": "#1E1B4B",
            "logo_label": "Urban",
            "logo_background_color": "#2D3748",
            "logo_text_color": "#FFFFFF",
        },
    ]

    clients = [Client(**data) for data in clients_data]
    session.add_all(clients)
    session.commit()

    users = [
        User(
            email="admin@mvp.ca",
            hashed_password=get_password_hash("admin123"),
            full_name="Administrator MVP Sports Analysis",
            role="staff",
            is_active=True,
        ),
        User(
            email="jodie@playerstopro.com",
            hashed_password=get_password_hash("ptp123456"),
            full_name="Athlete Development PTP Football",
            role="club",
            client_id=clients[1].id,
            is_active=True,
        ),
        User(
            email="urban@combine.dev",
            hashed_password=get_password_hash("urban123"),
            full_name="Urban Fut Analyst",
            role="club",
            client_id=clients[2].id,
            is_active=True,
        ),
    ]
    session.add_all(users)
    session.commit()

    tests_by_client: dict[int, list[TestDefinition]] = {}
    for client in clients:
        tests_payload = [
             {
            "name": "30m Sprint",
            "category": "Physical",
            "unit": "s",
            "target_direction": "lower"},
             
            {"name": "Vertical Jump",
             "category": "Physical",
             "unit": "cm",
             "target_direction": "higher"},
            {"name": "Yo-Yo IR1",
             "category": "Physical",
             "unit": "level",
             "target_direction": "higher"},
        ]
        tests = [
            TestDefinition(client_id=client.id, **payload) for payload in tests_payload
        ]
        session.add_all(tests)
        session.commit()
        tests_by_client[client.id] = tests

    age_categories = {
        "U12": 11,
        "U13": 13,
        "U14": 14,
        "U15": 15,
        "U16": 16,
        "U19": 18,
    }
    team_suffixes = ["A", "B", "C"]
    primary_positions = [
        "Goalkeeper",
        "Center Back",
        "Full Back",
        "Defensive Midfielder",
        "Central Midfielder",
        "Attacking Midfielder",
        "Winger",
        "Striker",
    ]
    first_names = [
        "Alex",
        "Aria",
        "Blake",
        "Briar",
        "Cameron",
        "Colby",
        "Drew",
        "Elliot",
        "Emerson",
        "Finn",
        "Gray",
        "Harlan",
        "Hayden",
        "Isa",
        "Jordan",
        "Jules",
        "Kai",
        "Kendall",
        "Logan",
        "Luca",
        "Mason",
        "Morgan",
        "Noa",
        "Owen",
        "Parker",
        "Quinn",
        "Reese",
        "Riley",
        "Sawyer",
        "Sage",
        "Taylor",
        "Tatum",
        "Urban",
        "Vale",
        "Winter",
        "Zion",
    ]
    last_names = [
        "Anders",
        "Bennett",
        "Brooks",
        "Carter",
        "Dalton",
        "Ellis",
        "Foster",
        "Grayson",
        "Hughes",
        "Iverson",
        "Jensen",
        "Keane",
        "Lennon",
        "Monroe",
        "Nolan",
        "Osborn",
        "Pryce",
        "Quincy",
        "Rowe",
        "Serrano",
        "Sullivan",
        "Tanner",
        "Vaughn",
        "Whitaker",
        "Wilder",
        "York",
        "Zimmer",
    ]

    client_owner_lookup = {client.id: None for client in clients}
    for user in users:
        if user.client_id:
            client_owner_lookup[user.client_id] = user.id
    default_owner_id = next((user.id for user in users if user.role == "staff"), None)

    athletes: list[Athlete] = []
    roster_by_team: dict[int, list[Athlete]] = {}

    for client in clients:
        team_owner_id = client_owner_lookup.get(client.id) or default_owner_id
        client_teams: list[Team] = []
        for age_label in age_categories:
            for suffix in team_suffixes:
                team = Team(
                    client_id=client.id,
                    name=f"{age_label} Team {suffix}",
                    age_category=age_label,
                    description=f"{age_label} development squad",
                    created_by_id=team_owner_id,
                )
                session.add(team)
        session.commit()
        client_teams = session.exec(select(Team).where(Team.client_id == client.id)).all()

        name_index = 0
        for team in client_teams:
            target_age = age_categories.get(team.age_category, 16)
            roster: list[Athlete] = []
            for idx in range(11):
                first = first_names[name_index % len(first_names)]
                last = last_names[(name_index // len(first_names)) % len(last_names)]
                name_index += 1
                email_slug = f"{team.name.lower().replace(' ', '_')}_{idx}_{team.id}"

                primary = primary_positions[(idx + team.id) % len(primary_positions)]
                secondary_pool = [pos for pos in primary_positions if pos != primary]
                secondary = secondary_pool[(idx * 3) % len(secondary_pool)] if idx % 2 else None

                birth_date = (
                    datetime.utcnow() - timedelta(days=target_age * 365 + randint(0, 330))
                ).date()
                athlete = Athlete(
                    client_id=client.id,
                    team_id=team.id,
                    first_name=first,
                    last_name=last,
                    email=f"{email_slug}@{client.slug}.dev",
                    club_affiliation=team.name,
                    dominant_foot="right" if idx % 3 else "left",
                    height_cm=170 + randint(-7, 8),
                    weight_kg=65 + randint(-6, 7),
                    birth_date=birth_date,
                    status=AthleteStatus.active,
                    gender=AthleteGender.male if idx % 2 == 0 else AthleteGender.female,
                    primary_position=primary,
                    secondary_position=secondary,
                )
                session.add(athlete)
                session.flush()
                roster.append(athlete)
                athletes.append(athlete)
            roster_by_team[team.id] = roster
        session.commit()

        opponents = [
            "Academy Lions",
            "River United",
            "City Select",
            "Metro FC",
            "Valley Rovers",
            "Capital SC",
        ]
        match_stats: list[MatchStat] = []
        for team in client_teams:
            roster = roster_by_team.get(team.id, [])
            if not roster:
                continue
            if not team.coach_name:
                surname = roster[0].last_name
                team.coach_name = f"{roster[0].first_name[0]}. {surname}"
                session.add(team)
            for _ in range(12):
                match_date = datetime.utcnow() - timedelta(days=randint(1, 240))
                opponent = opponents[randint(0, len(opponents) - 1)]
                for athlete in roster:
                    if randint(0, 100) < 55:
                        goals = 1 if randint(0, 100) < 12 else (2 if randint(0, 100) < 3 else 0)
                        shootout_attempts = 1 if randint(0, 100) < 6 else 0
                        shootout_goals = shootout_attempts if randint(0, 100) < 70 else 0
                        minutes_played = 90 if randint(0, 100) < 60 else 60
                        if goals == 0 and shootout_goals == 0 and randint(0, 100) < 75:
                            continue
                        match_stats.append(
                            MatchStat(
                                athlete_id=athlete.id,
                                team_id=team.id,
                                match_date=match_date,
                                competition="League",
                                opponent=opponent,
                                goals=goals,
                                assists=randint(0, 2) if goals == 0 else randint(0, 1),
                                minutes_played=minutes_played,
                                shootout_attempts=shootout_attempts,
                                shootout_goals=shootout_goals,
                            )
                        )
        if match_stats:
            session.add_all(match_stats)
            session.commit()
    sessions_by_client: dict[int, list[AssessmentSession]] = {}
    for client in clients:
        sessions_payload = [
            {
                "name": "Pre-season",
                "location": "Training Center",
                "scheduled_at": datetime.utcnow() - timedelta(days=30),
                "notes": "Initial evaluation of the athletes",
            },
            {
                "name": "Mid-season evaluation",
                "location": "Main stadium",
                "scheduled_at": datetime.utcnow() - timedelta(days=7),
                "notes": "Review of physical indicators",
            },
        ]
        sessions = [
            AssessmentSession(client_id=client.id, **payload)
            for payload in sessions_payload
        ]
        session.add_all(sessions)
        session.commit()
        sessions_by_client[client.id] = sessions

    def generate_value(test: TestDefinition) -> float:
        base_values = {
            "30m Sprint": uniform(4.0, 4.6),
            "Vertical Jump": uniform(55, 75),
            "Yo-Yo IR1": uniform(18, 22),
        }
        return round(base_values.get(test.name, uniform(10, 20)), 2)

    for athlete in athletes:
        tests = tests_by_client[athlete.client_id]
        sessions = sessions_by_client[athlete.client_id]
        for assessment_session in sessions:
            for test in tests:
                result = SessionResult(
                    session_id=assessment_session.id,
                    athlete_id=athlete.id,
                    test_id=test.id,
                    value=generate_value(test),
                    unit=test.unit,
                )
                session.add(result)
    session.commit()

    # Enrich Players To Pro dataset with the detailed sheet (runs only on empty DB).
    # seed_ptp_rich_data(session, clients)
