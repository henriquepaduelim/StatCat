"""
Tests for event participant management.
"""
from datetime import date, time

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.security import get_password_hash
from app.models.event import Event, EventParticipant, ParticipantStatus
from app.models.user import User, UserRole
from tests.conftest import get_auth_token


def _create_coach(session: Session) -> User:
    coach = User(
        email="coach_invite@example.com",
        hashed_password=get_password_hash("coachpass123"),
        full_name="Coach Invitee",
        role=UserRole.COACH,
        is_active=True,
    )
    session.add(coach)
    session.commit()
    session.refresh(coach)
    return coach


def _create_event(session: Session, creator_id: int) -> Event:
    event = Event(
        name="Training Session",
        event_date=date(2025, 1, 1),
        start_time=time(10, 0),
        location="Main Field",
        notes="Bring gear",
        created_by_id=creator_id,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def test_add_event_participants(client: TestClient, session: Session, admin_user: User):
    """Adding participants should create EventParticipant rows."""
    coach = _create_coach(session)
    event = _create_event(session, admin_user.id)

    token = get_auth_token(client, admin_user.email, "adminpass123")
    response = client.post(
        f"/api/v1/events/{event.id}/participants",
        headers={"Authorization": f"Bearer {token}"},
        json={"user_ids": [coach.id], "send_notification": False},
    )
    assert response.status_code == 200

    participant = session.exec(
        select(EventParticipant).where(
            EventParticipant.event_id == event.id,
            EventParticipant.user_id == coach.id,
        )
    ).first()
    assert participant is not None
    assert participant.status == ParticipantStatus.INVITED


def test_remove_event_participant(client: TestClient, session: Session, admin_user: User):
    """Deleting a participant should remove the EventParticipant record."""
    coach = _create_coach(session)
    event = _create_event(session, admin_user.id)
    participant = EventParticipant(
        event_id=event.id,
        user_id=coach.id,
        status=ParticipantStatus.INVITED,
    )
    session.add(participant)
    session.commit()

    token = get_auth_token(client, admin_user.email, "adminpass123")
    response = client.delete(
        f"/api/v1/events/{event.id}/participants/{coach.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 204

    remaining = session.exec(
        select(EventParticipant).where(
            EventParticipant.event_id == event.id,
            EventParticipant.user_id == coach.id,
        )
    ).first()
    assert remaining is None
