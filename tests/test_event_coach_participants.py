from datetime import date

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.user import User, UserRole
from app.models.team import Team, CoachTeamLink
from app.core.security import get_password_hash
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


def _create_team(session: Session, name: str) -> Team:
    team = Team(
        name=name,
        age_category="U14",
        description="",
        created_by_id=1,
    )
    session.add(team)
    session.commit()
    session.refresh(team)
    return team


def _attach_coach_to_team(session: Session, coach_id: int, team_id: int) -> None:
    link = CoachTeamLink(user_id=coach_id, team_id=team_id)
    session.add(link)
    session.commit()


def _auth_headers(client: TestClient, admin: User) -> dict:
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": admin.email, "password": "adminpass123"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# Fixture admins already exist in conftest as admin_user

def test_create_event_with_team_includes_coach(
    client: TestClient, session: Session, admin_user: User
):
    team = _create_team(session, "Team A")
    coach = _create_coach(session, "coach1@example.com", "Coach One")
    _attach_coach_to_team(session, coach.id, team.id)

    headers = _auth_headers(client, admin_user)
    resp = client.post(
        "/api/v1/events/",
        json={
          "name": "E2E-Coach-Create",
          "event_date": str(date.today()),
          "start_time": "10:00",
          "location": "Gym",
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
    assert resp.status_code == 201
    event_id = resp.json()["id"]

    participant = session.exec(
        session.query(EventParticipant).filter_by(event_id=event_id, user_id=coach.id)
    ).first()
    assert participant is not None


def test_update_event_adds_coach_from_new_team_without_duplicates(
    client: TestClient, session: Session, admin_user: User
):
    team_a = _create_team(session, "Team A")
    team_b = _create_team(session, "Team B")
    coach_a = _create_coach(session, "coachA@example.com", "Coach A")
    coach_b = _create_coach(session, "coachB@example.com", "Coach B")
    _attach_coach_to_team(session, coach_a.id, team_a.id)
    _attach_coach_to_team(session, coach_b.id, team_b.id)

    headers = _auth_headers(client, admin_user)
    create_resp = client.post(
        "/api/v1/events/",
        json={
          "name": "E2E-Coach-Update",
          "event_date": str(date.today()),
          "start_time": "11:00",
          "location": "Field",
          "notes": "",
          "team_ids": [team_a.id],
          "coach_id": None,
          "athlete_ids": [],
          "invitee_ids": [],
          "send_email": False,
          "send_push": False,
        },
        headers=headers,
    )
    assert create_resp.status_code == 201
    event_id = create_resp.json()["id"]

    # initial participants include coach A
    participants_a = session.exec(
        session.query(EventParticipant).filter_by(event_id=event_id, user_id=coach_a.id)
    ).all()
    assert len(participants_a) == 1

    # update adding team B
    update_resp = client.put(
        f"/api/v1/events/{event_id}",
        json={"team_ids": [team_a.id, team_b.id], "send_notification": False},
        headers=headers,
    )
    assert update_resp.status_code == 200

    participants_b = session.exec(
        session.query(EventParticipant).filter_by(event_id=event_id, user_id=coach_b.id)
    ).all()
    assert len(participants_b) == 1

    # ensure no duplicate for coach A
    participants_a_after = session.exec(
        session.query(EventParticipant).filter_by(event_id=event_id, user_id=coach_a.id)
    ).all()
    assert len(participants_a_after) == 1
