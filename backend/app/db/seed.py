from __future__ import annotations

from datetime import datetime, timedelta
from random import randint, uniform

from sqlmodel import Session, select

from app.models import (
    AssessmentSession,
    Athlete,
    Client,
    SessionResult,
    TestDefinition,
)


def seed_database(session: Session) -> None:
    if session.exec(select(Client.id)).first():
        return

    clients_data = [
        {
            "name": "Combine Geral",
            "slug": "combine",
            "description": "Layout oficial do evento",
            "primary_color": "#0E4C92",
            "accent_color": "#F97316",
            "background_color": "#F1F5F9",
            "surface_color": "#FFFFFF",
            "muted_color": "#64748B",
            "on_primary_color": "#FFFFFF",
            "on_surface_color": "#111827",
            "logo_label": "Combine",
            "logo_background_color": "#0E4C92",
            "logo_text_color": "#FFFFFF",
        },
        {
            "name": "Clube Auriverde",
            "slug": "auriverde",
            "description": "Tradição e alta performance",
            "primary_color": "#00703C",
            "accent_color": "#EAB308",
            "background_color": "#ECFDF5",
            "surface_color": "#FFFFFF",
            "muted_color": "#1E402D",
            "on_primary_color": "#FFFFFF",
            "on_surface_color": "#162D24",
            "logo_label": "Auriverde",
            "logo_background_color": "#00703C",
            "logo_text_color": "#FFFFFF",
        },
        {
            "name": "Urban Fut",
            "slug": "urban-fut",
            "description": "Academia de atletas urbanos",
            "primary_color": "#6D28D9",
            "accent_color": "#06B6D4",
            "background_color": "#F3F4FF",
            "surface_color": "#FFFFFF",
            "muted_color": "#581C87",
            "on_primary_color": "#FFFFFF",
            "on_surface_color": "#1E1B4B",
            "logo_label": "Urban",
            "logo_background_color": "#4338CA",
            "logo_text_color": "#FFFFFF",
        },
    ]

    clients = [Client(**data) for data in clients_data]
    session.add_all(clients)
    session.commit()

    tests_by_client: dict[int, list[TestDefinition]] = {}
    for client in clients:
        tests_payload = [
            {
                "name": "Sprint 30m",
                "category": "Velocidade",
                "unit": "s",
                "description": "Tempo no sprint de 30 metros",
                "target_direction": "lower",
            },
            {
                "name": "Salto Vertical",
                "category": "Potência",
                "unit": "cm",
                "description": "Altura do salto vertical com impulsão",
                "target_direction": "higher",
            },
            {
                "name": "Yo-Yo Test",
                "category": "Resistência",
                "unit": "niv",
                "description": "Nível alcançado no Yo-Yo Intermittent Recovery Test",
                "target_direction": "higher",
            },
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
                first_name=f"Atleta {idx}",
                last_name=client.slug.replace("-", " ").title(),
                email=f"atleta{idx}_{client.slug}@combine.dev",
                club_affiliation=client.name,
                dominant_foot="direito" if idx % 2 else "esquerdo",
                height_cm=175 + randint(-5, 6),
                weight_kg=70 + randint(-5, 6),
            )
            session.add(athlete)
            athletes.append(athlete)
    session.commit()

    sessions_by_client: dict[int, list[AssessmentSession]] = {}
    for client in clients:
        sessions_payload = [
            {
                "name": "Pré-temporada",
                "location": "Centro de Treinamento",
                "scheduled_at": datetime.utcnow() - timedelta(days=30),
                "notes": "Avaliação inicial dos atletas",
            },
            {
                "name": "Avaliação inter-temporada",
                "location": "Estádio principal",
                "scheduled_at": datetime.utcnow() - timedelta(days=7),
                "notes": "Revisão dos indicadores físicos",
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
            "Sprint 30m": uniform(4.0, 4.6),
            "Salto Vertical": uniform(55, 75),
            "Yo-Yo Test": uniform(18, 22),
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
