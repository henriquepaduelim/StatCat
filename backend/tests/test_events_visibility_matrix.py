from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine

from app.api.deps import get_current_active_user, get_session
from app.main import app
from app.models.athlete import Athlete
from app.models.event import Event
from app.models.event_participant import EventParticipant, ParticipantStatus
from app.models.event_team_link import EventTeamLink
from app.models.team import CoachTeamLink, Team
from app.models.user import User, UserRole, UserAthleteApprovalStatus


@pytest.fixture
def test_engine(tmp_path):
    db_path = tmp_path / "events_visibility.db"
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


def _make_coach(session: Session, email: str = "coach@example.com") -> User:
    coach = User(
        email=email,
        hashed_password="x",
        full_name="Coach",
        role=UserRole.COACH,
        is_active=True,
    )
    session.add(coach)
    session.commit()
    session.refresh(coach)
    return coach


def _make_admin(session: Session) -> User:
    admin = User(
        email="admin@example.com",
        hashed_password="x",
        full_name="Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    session.add(admin)
    session.commit()
    session.refresh(admin)
    return admin


def _make_staff(session: Session) -> User:
    staff = User(
        email="staff@example.com",
        hashed_password="x",
        full_name="Staff",
        role=UserRole.STAFF,
        is_active=True,
    )
    session.add(staff)
    session.commit()
    session.refresh(staff)
    return staff


def _make_team(session: Session, name: str = "Team A") -> Team:
    team = Team(name=name, age_category="U12", description=None)
    session.add(team)
    session.commit()
    session.refresh(team)
    return team


def _make_event(session: Session, creator: User) -> Event:
    event = Event(
        name="Friendly Match",
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


def _make_athlete_user(session: Session, team_id: int | None = None) -> User:
    athlete = Athlete(
        first_name="Ath",
        last_name="User",
        email="athlete@example.com",
        phone=None,
        birth_date=date(2000, 1, 1),
        gender="male",
        team_id=team_id,
        primary_position="Forward",
    )
    session.add(athlete)
    session.flush()

    user = User(
        email=athlete.email,
        hashed_password="x",
        full_name="Athlete User",
        role=UserRole.ATHLETE,
        athlete_id=athlete.id,
        athlete_status=UserAthleteApprovalStatus.APPROVED,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def test_coach_sees_event_by_direct_invite(test_engine, client):
    with Session(test_engine) as session:
        coach = _make_coach(session)
        admin = _make_admin(session)
        event = _make_event(session, admin)
        session.add(
            EventParticipant(
                event_id=event.id,
                user_id=coach.id,
                status=ParticipantStatus.INVITED,
            )
        )
        session.commit()
        coach_id = coach.id
        event_id = event.id

    app.dependency_overrides[get_current_active_user] = _user_override(
        test_engine, coach_id
    )
    response = client.get("/api/v1/events/my-events")
    assert response.status_code == 200
    event_ids = [item["id"] for item in response.json()]
    assert event_ids.count(event_id) == 1


def test_coach_sees_event_by_team_link(test_engine, client):
    with Session(test_engine) as session:
        coach = _make_coach(session, email="coach2@example.com")
        admin = _make_admin(session)
        team = _make_team(session)
        session.add(CoachTeamLink(user_id=coach.id, team_id=team.id))
        event = _make_event(session, admin)
        session.add(EventTeamLink(event_id=event.id, team_id=team.id))
        session.commit()
        coach_id = coach.id
        event_id = event.id

    app.dependency_overrides[get_current_active_user] = _user_override(
        test_engine, coach_id
    )
    response = client.get("/api/v1/events/my-events")
    assert response.status_code == 200
    event_ids = [item["id"] for item in response.json()]
    assert event_ids.count(event_id) == 1


def test_coach_does_not_see_event_without_link(test_engine, client):
    with Session(test_engine) as session:
        coach = _make_coach(session, email="coach3@example.com")
        admin = _make_admin(session)
        _make_event(session, admin)
        session.commit()
        coach_id = coach.id

    app.dependency_overrides[get_current_active_user] = _user_override(
        test_engine, coach_id
    )
    response = client.get("/api/v1/events/my-events")
    assert response.status_code == 200
    assert response.json() == []


def test_athlete_sees_event_when_invited(test_engine, client):
    with Session(test_engine) as session:
        admin = _make_admin(session)
        athlete_user = _make_athlete_user(session)
        event = _make_event(session, admin)
        session.add(
            EventParticipant(
                event_id=event.id,
                athlete_id=athlete_user.athlete_id,
                status=ParticipantStatus.INVITED,
            )
        )
        session.commit()
        athlete_user_id = athlete_user.id
        event_id = event.id

    app.dependency_overrides[get_current_active_user] = _user_override(
        test_engine, athlete_user_id
    )
    response = client.get("/api/v1/events/my-events")
    assert response.status_code == 200
    event_ids = [item["id"] for item in response.json()]
    assert event_ids.count(event_id) == 1


def test_admin_and_staff_list_events(test_engine, client):
    with Session(test_engine) as session:
        admin = _make_admin(session)
        staff = _make_staff(session)
        event = _make_event(session, admin)
        session.commit()
        event_id = event.id
        admin_id = admin.id
        staff_id = staff.id

    app.dependency_overrides[get_current_active_user] = _user_override(
        test_engine, admin_id
    )
    resp_admin = client.get("/api/v1/events/")
    assert resp_admin.status_code == 200
    admin_ids = [item["id"] for item in resp_admin.json()]
    assert event_id in admin_ids

    app.dependency_overrides[get_current_active_user] = _user_override(
        test_engine, staff_id
    )
    resp_staff = client.get("/api/v1/events/")
    assert resp_staff.status_code == 200
    staff_ids = [item["id"] for item in resp_staff.json()]
    assert event_id in staff_ids
