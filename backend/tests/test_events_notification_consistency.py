from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine, select

from app.api.deps import get_current_active_user, get_session
from app.main import app
from app.models.event import Event
from app.models.event_participant import EventParticipant, ParticipantStatus
from app.models.user import User, UserRole


@pytest.fixture
def test_engine(tmp_path):
    db_path = tmp_path / "events_notification.db"
    engine = create_engine(
        f"sqlite:///{db_path}", connect_args={"check_same_thread": False}
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def client(test_engine):
    def _session_override():
        with Session(test_engine) as session:
            yield session

    app.dependency_overrides[get_session] = _session_override
    yield TestClient(app)
    app.dependency_overrides.clear()


def _user_override(engine, user_id: int):
    def _dep():
        with Session(engine) as session:
            return session.get(User, user_id)

    return _dep


def test_event_participants_exist_before_email_sent(monkeypatch, test_engine, client):
    send_calls = []

    async def _fake_send(*args, **kwargs):
        send_calls.append(args)
        return True

    monkeypatch.setattr(
        "app.services.email_service.EmailService.send_event_invitation", _fake_send
    )

    with Session(test_engine) as session:
        admin = User(
            email="admin@example.com",
            hashed_password="x",
            full_name="Admin",
            role=UserRole.ADMIN,
            is_active=True,
        )
        invitee = User(
            email="user@example.com",
            hashed_password="x",
            full_name="User",
            role=UserRole.COACH,
            is_active=True,
        )
        session.add_all([admin, invitee])
        session.commit()
        session.refresh(admin)
        session.refresh(invitee)
        admin_id = admin.id
        invitee_id = invitee.id

    app.dependency_overrides[get_current_active_user] = _user_override(
        test_engine, admin_id
    )

    payload = {
        "name": "Notify Event",
        "event_date": date.today().isoformat(),
        "start_time": "12:00",
        "location": "Field",
        "notes": "",
        "team_ids": [],
        "invitee_ids": [invitee_id],
        "athlete_ids": [],
        "send_email": True,
        "send_push": False,
    }
    resp = client.post("/api/v1/events/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    event_id = data["id"]

    with Session(test_engine) as session:
        participants = session.exec(
            select(EventParticipant).where(EventParticipant.event_id == event_id)
        ).all()
        assert participants, "Participants should exist before marking email sent"
        participant_user_ids = {p.user_id for p in participants}
        assert invitee_id in participant_user_ids

        event = session.get(Event, event_id)
        assert event.email_sent is True
        assert event.push_sent is False

    assert send_calls, "Email send should have been enqueued/called"
