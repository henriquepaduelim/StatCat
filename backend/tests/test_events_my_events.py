from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine

from app.api.deps import get_current_active_user, get_session
from app.main import app
from app.models.event import Event
from app.models.event_participant import EventParticipant, ParticipantStatus
from app.models.event_team_link import EventTeamLink
from app.models.team import CoachTeamLink, Team
from app.models.athlete import Athlete
from app.models.user import User, UserRole, UserAthleteApprovalStatus


@pytest.fixture
def test_engine(tmp_path):
    db_path = tmp_path / "events_my_events.db"
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


def _make_users_and_team(session: Session):
    coach = User(
        email="coach@example.com",
        hashed_password="x",
        full_name="Coach",
        role=UserRole.COACH,
        is_active=True,
    )
    creator = User(
        email="admin@example.com",
        hashed_password="x",
        full_name="Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    team = Team(name="Team A", age_category="U12", description="Test team")
    session.add_all([coach, creator, team])
    session.commit()
    session.refresh(coach)
    session.refresh(creator)
    session.refresh(team)
    session.add(CoachTeamLink(user_id=coach.id, team_id=team.id))
    session.commit()
    return coach, creator, team


def _make_team_event(session: Session, creator: User) -> Event:
    event = Event(
        name="Team Practice",
        event_date=date(2024, 9, 1),
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


def _make_athlete_user(session: Session, team: Team) -> User:
    athlete = Athlete(
        first_name="Ath",
        last_name="User",
        email="athlete@example.com",
        phone=None,
        birth_date=date(2000, 1, 1),
        gender="male",
        team_id=team.id,
        primary_position="Forward",
    )
    session.add(athlete)
    session.flush()

    user = User(
        email="athlete@example.com",
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


def _current_user_override(engine, user_id: int):
    def _dep():
        with Session(engine) as session:
            return session.get(User, user_id)

    return _dep


def test_coach_sees_events_linked_by_team_without_direct_invite(test_engine, client):
    with Session(test_engine) as session:
        coach, creator, team = _make_users_and_team(session)
        event = _make_team_event(session, creator)
        session.add(EventTeamLink(event_id=event.id, team_id=team.id))
        session.commit()
        coach_id = coach.id
        event_id = event.id

    app.dependency_overrides[get_current_active_user] = _current_user_override(
        test_engine, coach_id
    )

    response = client.get("/api/v1/events/my-events")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == event_id


def test_coach_does_not_see_events_from_unrelated_team(test_engine, client):
    with Session(test_engine) as session:
        coach, creator, team = _make_users_and_team(session)
        unrelated_team = Team(name="Other Team", age_category="U14", description=None)
        session.add(unrelated_team)
        session.commit()
        session.refresh(unrelated_team)
        event = _make_team_event(session, creator)
        session.add(EventTeamLink(event_id=event.id, team_id=unrelated_team.id))
        session.commit()
        coach_id = coach.id
        unrelated_event_id = event.id

    app.dependency_overrides[get_current_active_user] = _current_user_override(
        test_engine, coach_id
    )

    response = client.get("/api/v1/events/my-events")
    assert response.status_code == 200
    data = response.json()
    returned_ids = [item["id"] for item in data]
    assert unrelated_event_id not in returned_ids


def test_coach_event_not_duplicated_when_team_link_and_invite(test_engine, client):
    with Session(test_engine) as session:
        coach, creator, team = _make_users_and_team(session)
        event = _make_team_event(session, creator)
        session.add(EventTeamLink(event_id=event.id, team_id=team.id))
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

    app.dependency_overrides[get_current_active_user] = _current_user_override(
        test_engine, coach_id
    )

    response = client.get("/api/v1/events/my-events")
    assert response.status_code == 200
    data = response.json()
    event_ids = [item["id"] for item in data]
    assert event_ids.count(event_id) == 1


def test_coach_sees_event_by_participant_invite_only(test_engine, client):
    with Session(test_engine) as session:
        coach = User(
            email="coach2@example.com",
            hashed_password="x",
            full_name="Coach2",
            role=UserRole.COACH,
            is_active=True,
        )
        creator = User(
            email="admin2@example.com",
            hashed_password="x",
            full_name="Admin2",
            role=UserRole.ADMIN,
            is_active=True,
        )
        session.add_all([coach, creator])
        session.commit()
        session.refresh(coach)
        session.refresh(creator)

        event = _make_team_event(session, creator)
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

    app.dependency_overrides[get_current_active_user] = _current_user_override(
        test_engine, coach_id
    )

    response = client.get("/api/v1/events/my-events")
    assert response.status_code == 200
    data = response.json()
    event_ids = [item["id"] for item in data]
    assert event_ids.count(event_id) == 1


def test_admin_sees_all_events(test_engine, client):
    with Session(test_engine) as session:
        admin = User(
            email="admin3@example.com",
            hashed_password="x",
            full_name="Admin3",
            role=UserRole.ADMIN,
            is_active=True,
        )
        coach = User(
            email="coach3@example.com",
            hashed_password="x",
            full_name="Coach3",
            role=UserRole.COACH,
            is_active=True,
        )
        session.add_all([admin, coach])
        session.commit()
        session.refresh(admin)
        session.refresh(coach)

        e1 = _make_team_event(session, admin)
        e2 = _make_team_event(session, coach)
        admin_id = admin.id
        e1_id = e1.id
        e2_id = e2.id

    app.dependency_overrides[get_current_active_user] = _current_user_override(
        test_engine, admin_id
    )

    response = client.get("/api/v1/events/my-events")
    assert response.status_code == 200
    data = response.json()
    returned_ids = {item["id"] for item in data}
    assert {e1_id, e2_id}.issubset(returned_ids)


def test_athlete_sees_event_via_team_link(test_engine, client):
    with Session(test_engine) as session:
        coach, creator, team = _make_users_and_team(session)
        athlete_user = _make_athlete_user(session, team)
        event = _make_team_event(session, creator)
        session.add(EventTeamLink(event_id=event.id, team_id=team.id))
        session.commit()
        athlete_user_id = athlete_user.id
        event_id = event.id

    app.dependency_overrides[get_current_active_user] = _current_user_override(
        test_engine, athlete_user_id
    )

    response = client.get("/api/v1/events/my-events")
    assert response.status_code == 200
    data = response.json()
    event_ids = [item["id"] for item in data]
    assert event_ids.count(event_id) == 1


def test_athlete_sees_event_by_participant_invite(test_engine, client):
    with Session(test_engine) as session:
        coach, creator, team = _make_users_and_team(session)
        athlete_user = _make_athlete_user(session, team)
        event = _make_team_event(session, creator)
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

    app.dependency_overrides[get_current_active_user] = _current_user_override(
        test_engine, athlete_user_id
    )

    response = client.get("/api/v1/events/my-events")
    assert response.status_code == 200
    data = response.json()
    event_ids = [item["id"] for item in data]
    assert event_ids.count(event_id) == 1
