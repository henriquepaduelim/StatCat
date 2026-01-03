from datetime import date

from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
import pytest

from app.api.deps import get_current_active_user, get_session
from app.main import app
from app.models.event import Event
from app.models.event_team_link import EventTeamLink
from app.models.team import CoachTeamLink, Team
from app.models.user import User, UserRole


@pytest.fixture
def test_engine(tmp_path):
    db_path = tmp_path / "events_update.db"
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


def _make_user(session: Session, email: str, role: UserRole) -> User:
    user = User(
        email=email,
        hashed_password="x",
        full_name=email.split("@")[0],
        role=role,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _make_team(session: Session, name: str) -> Team:
    team = Team(name=name, age_category="U12", description=None)
    session.add(team)
    session.commit()
    session.refresh(team)
    return team


def _make_event(session: Session, creator: User) -> Event:
    event = Event(
        name="Update Event",
        event_date=date(2025, 1, 1),
        start_time=None,
        location="Field",
        notes=None,
        team_id=None,
        coach_id=None,
        created_by_id=creator.id,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def test_update_event_adds_team_visibility_for_coaches(test_engine, client):
    with Session(test_engine) as session:
        admin = _make_user(session, "admin@example.com", UserRole.ADMIN)
        coach_a = _make_user(session, "coachA@example.com", UserRole.COACH)
        coach_b = _make_user(session, "coachB@example.com", UserRole.COACH)
        team_a = _make_team(session, "Team A")
        team_b = _make_team(session, "Team B")
        session.add_all(
            [
                CoachTeamLink(user_id=coach_a.id, team_id=team_a.id),
                CoachTeamLink(user_id=coach_b.id, team_id=team_b.id),
            ]
        )
        event = _make_event(session, admin)
        session.add(EventTeamLink(event_id=event.id, team_id=team_a.id))
        session.commit()
        admin_id = admin.id
        coach_a_id = coach_a.id
        coach_b_id = coach_b.id
        event_id = event.id
        team_a_id = team_a.id
        team_b_id = team_b.id

    app.dependency_overrides[get_current_active_user] = _user_override(
        test_engine, admin_id
    )
    update_payload = {
        "team_ids": [team_a_id, team_b_id],
        "send_notification": False,
    }
    resp_update = client.put(f"/api/v1/events/{event_id}", json=update_payload)
    assert resp_update.status_code == 200

    app.dependency_overrides[get_current_active_user] = _user_override(
        test_engine, coach_a_id
    )
    resp_coach_a = client.get("/api/v1/events/my-events")
    assert resp_coach_a.status_code == 200
    ids_a = [item["id"] for item in resp_coach_a.json()]
    assert ids_a.count(event_id) == 1

    app.dependency_overrides[get_current_active_user] = _user_override(
        test_engine, coach_b_id
    )
    resp_coach_b = client.get("/api/v1/events/my-events")
    assert resp_coach_b.status_code == 200
    ids_b = [item["id"] for item in resp_coach_b.json()]
    assert ids_b.count(event_id) == 1
