from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine

from app.api.deps import get_current_active_user, get_session
from app.core.security import get_password_hash
from app.main import app
from app.models.athlete import Athlete
from app.models.user import User, UserRole, UserAthleteApprovalStatus


@pytest.fixture
def test_engine(tmp_path):
    db_path = tmp_path / "auth_access.db"
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


def _create_user(
    session: Session,
    *,
    email: str,
    role: UserRole,
    athlete_status: UserAthleteApprovalStatus | None = None,
    must_change_password: bool | None = None,
) -> User:
    athlete_id = None
    if role == UserRole.ATHLETE:
        athlete = Athlete(
            first_name="Test",
            last_name="Athlete",
            email=email,
            phone=None,
            birth_date=date(2000, 1, 1),
            gender="male",
            team_id=None,
            primary_position="Forward",
        )
        session.add(athlete)
        session.flush()
        athlete_id = athlete.id

    user = User(
        email=email,
        hashed_password=get_password_hash("secret123"),
        full_name=f"{role.value} User",
        role=role,
        athlete_id=athlete_id,
        athlete_status=athlete_status,
        must_change_password=must_change_password,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _override_user(engine, user_id: int):
    def _dep():
        with Session(engine) as session:
            return session.get(User, user_id)

    return _dep


def test_login_all_roles_succeed(test_engine, client):
    with Session(test_engine) as session:
        athlete = _create_user(
            session,
            email="athlete@example.com",
            role=UserRole.ATHLETE,
            athlete_status=UserAthleteApprovalStatus.APPROVED,
        )
        coach = _create_user(
            session, email="coach@example.com", role=UserRole.COACH
        )
        admin = _create_user(
            session, email="admin@example.com", role=UserRole.ADMIN
        )
        emails = (athlete.email, coach.email, admin.email)

    for email in emails:
        response = client.post(
            "/api/v1/auth/login",
            data={"username": email, "password": "secret123"},
            headers={"content-type": "application/x-www-form-urlencoded"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body.get("access_token")


def test_login_blocked_for_unapproved_athlete(test_engine, client):
    with Session(test_engine) as session:
        _create_user(
            session,
            email="pending@example.com",
            role=UserRole.ATHLETE,
            athlete_status=UserAthleteApprovalStatus.PENDING,
        )

    response = client.post(
        "/api/v1/auth/login",
        data={"username": "pending@example.com", "password": "secret123"},
        headers={"content-type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 403
    assert "pending approval" in response.json().get("detail", "").lower()


def test_login_blocked_when_must_change_password(test_engine, client):
    with Session(test_engine) as session:
        _create_user(
            session,
            email="reset@example.com",
            role=UserRole.COACH,
            must_change_password=True,
        )

    response = client.post(
        "/api/v1/auth/login",
        data={"username": "reset@example.com", "password": "secret123"},
        headers={"content-type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 403
    detail = response.json().get("detail", "").lower()
    assert "must set your password" in detail


def test_athlete_cannot_access_admin_only_endpoint(test_engine, client):
    with Session(test_engine) as session:
        athlete = _create_user(
            session,
            email="athlete2@example.com",
            role=UserRole.ATHLETE,
            athlete_status=UserAthleteApprovalStatus.APPROVED,
        )
        target = _create_user(
            session,
            email="other@example.com",
            role=UserRole.ATHLETE,
            athlete_status=UserAthleteApprovalStatus.APPROVED,
        )
        athlete_id = athlete.id
        target_athlete_id = target.athlete_id
    app.dependency_overrides[get_current_active_user] = _override_user(
        test_engine, athlete_id
    )

    response = client.post(f"/api/v1/athletes/{target_athlete_id}/approve")
    assert response.status_code == 403


def test_coach_cannot_access_admin_only_endpoint(test_engine, client):
    with Session(test_engine) as session:
        coach = _create_user(
            session, email="coach2@example.com", role=UserRole.COACH
        )
        target = _create_user(
            session,
            email="other2@example.com",
            role=UserRole.ATHLETE,
            athlete_status=UserAthleteApprovalStatus.APPROVED,
        )
        coach_id = coach.id
        target_athlete_id = target.athlete_id
    app.dependency_overrides[get_current_active_user] = _override_user(
        test_engine, coach_id
    )

    response = client.post(f"/api/v1/athletes/{target_athlete_id}/approve")
    assert response.status_code == 403


def test_unauthenticated_request_gets_401(client):
    response = client.get("/api/v1/events/my-events")
    assert response.status_code == 401
