from __future__ import annotations

from datetime import datetime, timedelta
from random import randint, uniform

from sqlmodel import Session, delete, select

from app.core.security import get_password_hash
from app.models import (
    AssessmentSession,
    Athlete,
    Client,
    SessionResult,
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

    athletes: list[Athlete] = []
    for client in clients:
        for idx in range(1, 4):
            athlete = Athlete(
                client_id=client.id,
                first_name=f"Athlete {idx}",
                last_name=client.slug.replace("-", " ").title(),
                email=f"athlete{idx}_{client.slug}@combine.dev",
                club_affiliation=client.name,
                dominant_foot="right" if idx % 2 else "left",
                height_cm=175 + randint(-5, 6),
                weight_kg=70 + randint(-5, 6),
                birth_date=(datetime.utcnow() - timedelta(days=16 * 365 + randint(0, 365))).date(),
                status=AthleteStatus.inactive if idx == 3 else AthleteStatus.active,
                gender=AthleteGender.male if idx % 2 else AthleteGender.female,
            )
            session.add(athlete)
            athletes.append(athlete)
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
    seed_ptp_rich_data(session, clients)
