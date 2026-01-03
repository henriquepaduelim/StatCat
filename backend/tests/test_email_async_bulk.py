from datetime import date, datetime

from fastapi.testclient import TestClient
import pytest
from sqlmodel import SQLModel, Session, create_engine

from app.api.deps import get_current_active_user, get_session
from app.main import app
from app.models.event import Event, EventStatus
from app.models.event_participant import EventParticipant, ParticipantStatus
from app.models.user import User, UserRole


@pytest.fixture
def test_engine(tmp_path):
    db_path = tmp_path / "email_async.db"
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


def test_create_event_enqueues_bulk_emails(monkeypatch, test_engine, client):
    sent_calls = []

    def _enqueue(background_tasks, fn, *args, **kwargs):
        sent_calls.append(fn.__name__)

    monkeypatch.setattr("app.services.notification_service.enqueue_email", _enqueue)

    with Session(test_engine) as session:
        admin = User(
            email="admin@example.com",
            hashed_password="x",
            full_name="Admin",
            role=UserRole.ADMIN,
            is_active=True,
        )
        invitee = User(
            email="invitee@example.com",
            hashed_password="x",
            full_name="Invitee",
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
        "name": "Bulk Event",
        "event_date": date.today().isoformat(),
        "start_time": "10:00",
        "location": "Field",
        "notes": "",
        "team_ids": [],
        "invitee_ids": [invitee_id],
        "athlete_ids": [],
        "send_email": True,
        "send_push": False,
    }

    response = client.post("/api/v1/events/", json=payload)
    assert response.status_code == 201
    assert sent_calls  # at least one email enqueued
    assert "send_event_invitation" in sent_calls


def test_event_reminder_enqueues_bulk_emails(monkeypatch, test_engine, client):
    sent_calls = []

    def _enqueue(background_tasks, fn, *args, **kwargs):
        sent_calls.append(fn.__name__)

    monkeypatch.setattr("app.services.notification_service.enqueue_email", _enqueue)

    with Session(test_engine) as session:
        admin = User(
            email="admin2@example.com",
            hashed_password="x",
            full_name="Admin2",
            role=UserRole.ADMIN,
            is_active=True,
        )
        user = User(
            email="user@example.com",
            hashed_password="x",
            full_name="User",
            role=UserRole.COACH,
            is_active=True,
        )
        session.add_all([admin, user])
        session.commit()
        session.refresh(admin)
        session.refresh(user)
        event = Event(
            name="Reminder Event",
            event_date=date.today(),
            start_time=None,
            location="Arena",
            notes=None,
            team_id=None,
            coach_id=None,
            created_by_id=admin.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            status=EventStatus.SCHEDULED,
        )
        session.add(event)
        session.commit()
        session.refresh(event)
        participant = EventParticipant(
            event_id=event.id,
            user_id=user.id,
            status=ParticipantStatus.CONFIRMED,
            responded_at=datetime.utcnow(),
        )
        session.add(participant)
        session.commit()
        admin_id = admin.id
        event_id = event.id

    app.dependency_overrides[get_current_active_user] = _user_override(
        test_engine, admin_id
    )

    response = client.post(f"/api/v1/events/{event_id}/remind")
    assert response.status_code == 200
    assert sent_calls  # reminder enqueued
    assert "send_event_reminder" in sent_calls
