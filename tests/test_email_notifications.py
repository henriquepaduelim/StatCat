from __future__ import annotations

from datetime import date

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.api.v1.endpoints.auth import _generate_password_reset_token  # noqa: PLC2701
from app.models.team import Team
from app.models.event import EventParticipant, ParticipantStatus
from app.models.athlete import Athlete, AthleteGender
from tests.conftest import get_auth_token


def test_signup_triggers_pending_email(client: TestClient, fake_mailbox: dict[str, list[dict[str, object]]]) -> None:
    payload = {
        "full_name": "E2E Pending",
        "email": f"pending.{date.today().isoformat()}@example.com",
        "password": "E2e!12345",
        "first_name": "Pending",
        "last_name": "User",
        "birth_date": "2001-01-01",
        "gender": "male",
        "phone": "+15550001111",
    }
    response = client.post("/api/v1/auth/signup", json=payload)
    assert response.status_code == 201
    assert any("We received your registration" in email["subject"] for email in fake_mailbox["emails"])


def test_admin_approves_athlete_sends_email(
    client: TestClient, fake_mailbox: dict[str, list[dict[str, object]]], admin_user
) -> None:
    # First, public signup to create athlete/user
    payload = {
        "full_name": "E2E Approval",
        "email": f"approval.{date.today().isoformat()}@example.com",
        "password": "E2e!12345",
        "first_name": "Approval",
        "last_name": "User",
        "birth_date": "2002-02-02",
        "gender": "female",
        "phone": "+15550002222",
    }
    signup = client.post("/api/v1/auth/signup", json=payload)
    assert signup.status_code == 201
    athlete_id = signup.json()["athlete_id"]

    token = get_auth_token(client, admin_user.email, "adminpass123")
    approve = client.post(
        f"/api/v1/athletes/{athlete_id}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert approve.status_code == 200
    assert any("account is approved" in email["subject"].lower() for email in fake_mailbox["emails"])


def test_first_login_sends_welcome_email(
    client: TestClient, fake_mailbox: dict[str, list[dict[str, object]]], admin_user
) -> None:
    response = client.post(
        "/api/v1/auth/login",
        data={"username": admin_user.email, "password": "adminpass123"},
    )
    assert response.status_code == 200
    assert any("welcome to statcat" in email["subject"].lower() for email in fake_mailbox["emails"])


def test_password_reset_flow_sends_emails(
    client: TestClient, fake_mailbox: dict[str, list[dict[str, object]]], admin_user
) -> None:
    # Request reset
    request = client.post(
        "/api/v1/auth/password-reset/request",
        json={"email": admin_user.email},
    )
    assert request.status_code == 202
    assert any("reset your statcat password" in email["subject"].lower() for email in fake_mailbox["emails"])

    # Confirm reset with a generated token
    token = _generate_password_reset_token(admin_user.id)
    confirm = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": token, "new_password": "NewStrongPass!123"},
    )
    assert confirm.status_code == 200
    assert any("password has been updated" in email["body"].lower() or "password" in email["subject"].lower() for email in fake_mailbox["emails"])


def test_team_assignment_email_on_athlete_create(
    client: TestClient, session: Session, fake_mailbox: dict[str, list[dict[str, object]]], admin_user
) -> None:
    team = Team(name="E2E Team", age_category="U16", description="E2E desc", created_by_id=admin_user.id)
    session.add(team)
    session.commit()
    session.refresh(team)

    token = get_auth_token(client, admin_user.email, "adminpass123")
    payload = {
        "first_name": "Assigned",
        "last_name": "Player",
        "email": f"assigned.{date.today().isoformat()}@example.com",
        "gender": "male",
        "team_id": team.id,
        "primary_position": "Midfielder",
        "birth_date": "2005-05-05",
    }
    response = client.post(
        "/api/v1/athletes/",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert response.status_code == 201
    assert any("joined team" in email["subject"].lower() for email in fake_mailbox["emails"])


def test_event_invitation_email_on_create(
    client: TestClient, test_user, fake_mailbox: dict[str, list[dict[str, object]]], admin_user
) -> None:
    token = get_auth_token(client, admin_user.email, "adminpass123")
    payload = {
        "name": "E2E Invite",
        "event_date": date.today().isoformat(),
        "start_time": "10:00",
        "invitee_ids": [test_user.id],
        "send_email": True,
        "send_push": False,
    }
    response = client.post(
        "/api/v1/events/",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert response.status_code == 201
    assert any("you're invited" in email["subject"].lower() for email in fake_mailbox["emails"])


def test_event_update_sends_email_to_confirmed(
    client: TestClient, session: Session, test_user, fake_mailbox: dict[str, list[dict[str, object]]], admin_user
) -> None:
    token = get_auth_token(client, admin_user.email, "adminpass123")
    create_payload = {
        "name": "E2E Update",
        "event_date": date.today().isoformat(),
        "start_time": "11:00",
        "invitee_ids": [test_user.id],
        "send_email": False,  # we'll notify on update
        "send_push": False,
    }
    created = client.post(
        "/api/v1/events/",
        headers={"Authorization": f"Bearer {token}"},
        json=create_payload,
    )
    assert created.status_code == 201
    event_id = created.json()["id"]

    # Mark participant as confirmed
    participant = session.exec(
        select(EventParticipant).where(EventParticipant.event_id == event_id, EventParticipant.user_id == test_user.id)
    ).first()
    participant.status = ParticipantStatus.CONFIRMED
    session.add(participant)
    session.commit()

    update = client.put(
        f"/api/v1/events/{event_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"location": "New Venue", "send_notification": True},
    )
    assert update.status_code == 200
    assert any("event updated" in email["subject"].lower() for email in fake_mailbox["emails"])


def test_event_reminder_email(
    client: TestClient, session: Session, test_user, fake_mailbox: dict[str, list[dict[str, object]]], admin_user
) -> None:
    token = get_auth_token(client, admin_user.email, "adminpass123")
    payload = {
        "name": "E2E Reminder",
        "event_date": date.today().isoformat(),
        "start_time": "12:00",
        "invitee_ids": [test_user.id],
        "send_email": False,
        "send_push": False,
    }
    created = client.post(
        "/api/v1/events/",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert created.status_code == 201
    event_id = created.json()["id"]

    participant = session.exec(
        select(EventParticipant).where(EventParticipant.event_id == event_id, EventParticipant.user_id == test_user.id)
    ).first()
    participant.status = ParticipantStatus.CONFIRMED
    session.add(participant)
    session.commit()

    reminder = client.post(
        f"/api/v1/events/{event_id}/remind",
        headers={"Authorization": f"Bearer {token}"},
        params={"hours_until": 12},
    )
    assert reminder.status_code == 200
    assert any("reminder" in email["subject"].lower() for email in fake_mailbox["emails"])


def test_event_confirmation_receipt(
    client: TestClient, test_user, fake_mailbox: dict[str, list[dict[str, object]]], admin_user
) -> None:
    admin_token = get_auth_token(client, admin_user.email, "adminpass123")
    event_payload = {
        "name": "E2E Confirm",
        "event_date": date.today().isoformat(),
        "invitee_ids": [test_user.id],
        "send_email": False,
        "send_push": False,
    }
    created = client.post(
        "/api/v1/events/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=event_payload,
    )
    assert created.status_code == 201
    event_id = created.json()["id"]

    user_token = get_auth_token(client, test_user.email, "testpass123")
    confirm = client.post(
        f"/api/v1/events/{event_id}/confirm",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"status": "confirmed"},
    )
    assert confirm.status_code == 200
    assert any("confirmed" in email["subject"].lower() for email in fake_mailbox["emails"])


def test_report_ready_email_on_approval(
    client: TestClient, session: Session, fake_mailbox: dict[str, list[dict[str, object]]], admin_user
) -> None:
    # Create athlete with email
    athlete = Athlete(
        first_name="Report",
        last_name="Target",
        email="report.target@example.com",
        gender=AthleteGender.male,
        birth_date=date(2005, 1, 1),
    )
    session.add(athlete)
    session.commit()
    session.refresh(athlete)

    token = get_auth_token(client, admin_user.email, "adminpass123")
    submission = client.post(
        "/api/v1/report-submissions/report-card",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "athlete_id": athlete.id,
            "team_id": None,
            "technical_rating": 4,
            "physical_rating": 4,
            "training_rating": 4,
            "match_rating": 4,
            "general_notes": "Ready",
        },
    )
    assert submission.status_code == 201
    submission_id = submission.json()["id"]

    approve = client.post(
        f"/api/v1/report-submissions/{submission_id}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert approve.status_code == 200
    assert any("report card is ready" in email["subject"].lower() for email in fake_mailbox["emails"])
