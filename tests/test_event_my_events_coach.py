from datetime import date

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.team import Team, CoachTeamLink
from app.models.event_participant import EventParticipant


def _create_coach(session: Session, email: str, name: str) -> User:
    coach = User(
        email=email,
        hashed_password=get_password_hash("Temp1234"),
        full_name=name,
        role=UserRole.COACH,
        is_active=True,
    )
    session.add(coach)
    session.commit()
    session.refresh(coach)
    return coach


def _create_team(session: Session, name: str, created_by_id: int = 1) -> Team:
    team = Team(
        name=name,
        age_category="U14",
        description="",
        created_by_id=created_by_id,
    )
    session.add(team)
    session.commit()
    session.refresh(team)
    return team


def _attach_coach_to_team(session: Session, coach_id: int, team_id: int) -> None:
    session.add(CoachTeamLink(user_id=coach_id, team_id=team_id))
    session.commit()


def _auth_headers(client: TestClient, email: str, password: str) -> dict:
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_my_events_includes_team_events_for_coach(client: TestClient, session: Session, admin_user: User):
    coach = _create_coach(session, "coach-team@example.com", "Coach Team")
    team = _create_team(session, "Team A", created_by_id=admin_user.id)
    _attach_coach_to_team(session, coach.id, team.id)

    headers = _auth_headers(client, admin_user.email, "adminpass123")
    create_resp = client.post(
        "/api/v1/events/",
        json={
            "name": "CoachTeamEvent",
            "event_date": str(date.today()),
            "start_time": "09:00",
            "location": "Field",
            "notes": "",
            "team_ids": [team.id],
            "coach_id": None,
            "athlete_ids": [],
            "invitee_ids": [],
            "send_email": False,
            "send_push": False,
        },
        headers=headers,
    )
    assert create_resp.status_code == 201

    coach_headers = _auth_headers(client, coach.email, "Temp1234")
    my_events = client.get("/api/v1/events/my-events", headers=coach_headers)
    assert my_events.status_code == 200
    names = [event["name"] for event in my_events.json()]
    assert "CoachTeamEvent" in names


def test_my_events_includes_participant_even_without_team(client: TestClient, session: Session, admin_user: User):
    coach = _create_coach(session, "coach-participant@example.com", "Coach Participant")

    headers = _auth_headers(client, admin_user.email, "adminpass123")
    create_resp = client.post(
        "/api/v1/events/",
        json={
            "name": "CoachParticipantEvent",
            "event_date": str(date.today()),
            "start_time": "10:00",
            "location": "Gym",
            "notes": "",
            "team_ids": [],
            "coach_id": None,
            "athlete_ids": [],
            "invitee_ids": [coach.id],
            "send_email": False,
            "send_push": False,
        },
        headers=headers,
    )
    assert create_resp.status_code == 201
    event_id = create_resp.json()["id"]

    # ensure participant exists
    ep = session.exec(
        select(EventParticipant).where(
            EventParticipant.event_id == event_id,
            EventParticipant.user_id == coach.id,
        )
    ).first()
    assert ep is not None

    coach_headers = _auth_headers(client, coach.email, "Temp1234")
    my_events = client.get("/api/v1/events/my-events", headers=coach_headers)
    assert my_events.status_code == 200
    names = [event["name"] for event in my_events.json()]
    assert "CoachParticipantEvent" in names


def test_my_events_deduplicates_and_keeps_athlete_scope(client: TestClient, session: Session, admin_user: User, athlete_user: User):
    coach = _create_coach(session, "coach-multi@example.com", "Coach Multi")
    team = _create_team(session, "Team B", created_by_id=admin_user.id)
    _attach_coach_to_team(session, coach.id, team.id)

    headers = _auth_headers(client, admin_user.email, "adminpass123")
    # Event linked to team and also adding coach as invitee
    create_resp = client.post(
        "/api/v1/events/",
        json={
            "name": "CoachDuplicateEvent",
            "event_date": str(date.today()),
            "start_time": "12:00",
            "location": "Arena",
            "notes": "",
            "team_ids": [team.id],
            "coach_id": coach.id,
            "athlete_ids": [athlete_user.athlete_id] if athlete_user.athlete_id else [],
            "invitee_ids": [coach.id],
            "send_email": False,
            "send_push": False,
        },
        headers=headers,
    )
    assert create_resp.status_code == 201

    coach_headers = _auth_headers(client, coach.email, "Temp1234")
    my_events = client.get("/api/v1/events/my-events", headers=coach_headers)
    assert my_events.status_code == 200
    assert sum(1 for e in my_events.json() if e["name"] == "CoachDuplicateEvent") == 1

    athlete_headers = _auth_headers(client, athlete_user.email, "athletepass123")
    my_events_ath = client.get("/api/v1/events/my-events", headers=athlete_headers)
    assert my_events_ath.status_code == 200
    # atleta vê porque foi adicionado
    assert any(e["name"] == "CoachDuplicateEvent" for e in my_events_ath.json())
