from datetime import date, datetime

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine, select

from app.api.deps import get_current_active_user, get_session
from app.main import app
from app.models.event import Event, EventStatus
from app.models.event_participant import EventParticipant, ParticipantStatus
from app.models.event_team_link import EventTeamLink
from app.models.team import CoachTeamLink, Team
from app.models.user import User, UserRole
from app.models.athlete import Athlete


@pytest.fixture
def test_engine(tmp_path):
    db_path = tmp_path / "events_rsvp.db"
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


def _make_athlete_user(session: Session, email: str, team_id: int | None = None) -> User:
    athlete = Athlete(
        first_name="Ath",
        last_name="User",
        email=email,
        phone=None,
        birth_date=date(2000, 1, 1),
        gender="male",
        team_id=team_id,
        primary_position="Forward",
    )
    session.add(athlete)
    session.flush()
    user = User(
        email=email,
        hashed_password="x",
        full_name=email.split("@")[0],
        role=UserRole.ATHLETE,
        is_active=True,
        athlete_id=athlete.id,
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
        name="RSVP Event",
        event_date=date(2025, 1, 1),
        start_time=None,
        location="Field",
        notes=None,
        team_id=None,
        coach_id=None,
        created_by_id=creator.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        status=EventStatus.SCHEDULED,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def test_coach_rsvp_only_with_team_link(test_engine, client):
    with Session(test_engine) as session:
        admin = _make_user(session, "admin@example.com", UserRole.ADMIN)
        coach = _make_user(session, "coach@example.com", UserRole.COACH)
        team = _make_team(session, "TeamA")
        session.add(CoachTeamLink(user_id=coach.id, team_id=team.id))
        event_linked = _make_event(session, admin)
        session.add(EventTeamLink(event_id=event_linked.id, team_id=team.id))
        event_unlinked = _make_event(session, admin)
        session.commit()
        coach_id = coach.id
        event_linked_id = event_linked.id
        event_unlinked_id = event_unlinked.id

    app.dependency_overrides[get_current_active_user] = _user_override(
        test_engine, coach_id
    )

    resp_ok = client.post(
        f"/api/v1/events/{event_linked_id}/confirm",
        json={"status": "confirmed"},
    )
    assert resp_ok.status_code == 200

    resp_forbidden = client.post(
        f"/api/v1/events/{event_unlinked_id}/confirm",
        json={"status": "confirmed"},
    )
    assert resp_forbidden.status_code in {403, 404}

    with Session(test_engine) as session:
        participants = session.exec(
            select(EventParticipant).where(EventParticipant.user_id == coach_id)
        ).all()
        linked_ids = {p.event_id for p in participants}
        assert event_linked_id in linked_ids
        assert event_unlinked_id not in linked_ids


def test_athlete_rsvp_only_when_invited(test_engine, client):
    with Session(test_engine) as session:
        admin = _make_user(session, "admin2@example.com", UserRole.ADMIN)
        athlete = _make_athlete_user(session, "athlete@example.com")
        event_invited = _make_event(session, admin)
        session.add(
            EventParticipant(
                event_id=event_invited.id,
                user_id=athlete.id,
                athlete_id=athlete.athlete_id,
                status=ParticipantStatus.INVITED,
            )
        )
        event_not_invited = _make_event(session, admin)
        session.commit()
        athlete_id = athlete.id
        event_invited_id = event_invited.id
        event_not_invited_id = event_not_invited.id

    app.dependency_overrides[get_current_active_user] = _user_override(
        test_engine, athlete_id
    )

    resp_ok = client.post(
        f"/api/v1/events/{event_invited_id}/confirm",
        json={"status": "confirmed"},
    )
    assert resp_ok.status_code in {200, 201}

    resp_forbidden = client.post(
        f"/api/v1/events/{event_not_invited_id}/confirm",
        json={"status": "confirmed"},
    )
    assert resp_forbidden.status_code in {403, 404}

    with Session(test_engine) as session:
        participants = session.exec(
            select(EventParticipant).where(EventParticipant.user_id == athlete_id)
        ).all()
        linked_ids = {p.event_id for p in participants}
        assert event_invited_id in linked_ids
        assert event_not_invited_id not in linked_ids
