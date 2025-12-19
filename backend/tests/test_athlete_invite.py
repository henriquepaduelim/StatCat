import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine, select

from app.api.deps import get_current_active_user
from app.db.session import get_session
from app.main import app
from app.core.config import settings
from app.core.security import get_password_hash
from app.core.security_token import security_token_manager
from app.models.user import User, UserRole, UserAthleteApprovalStatus
from app.models.password_setup_code import PasswordSetupCode
from app.models.athlete import Athlete
from app.services.email_service import email_service
from datetime import date


@pytest.fixture
def test_engine(tmp_path):
    db_path = tmp_path / "test_invite.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture(autouse=True)
def override_deps(test_engine):
    def _session_override():
        with Session(test_engine) as session:
            yield session

    app.dependency_overrides[get_session] = _session_override
    app.dependency_overrides[get_current_active_user] = lambda: User(
        email="admin@test.com",
        hashed_password="x",
        full_name="Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    yield
    app.dependency_overrides.clear()


def _make_client(monkeypatch, send_result=True):
    async def fake_send_password_code(*args, **kwargs):
        return send_result

    monkeypatch.setattr(
        email_service, "send_password_code", fake_send_password_code
    )
    return TestClient(app)


def test_create_athlete_creates_user_and_sends_invite(test_engine, monkeypatch):
    client = _make_client(monkeypatch, send_result=True)

    payload = {
        "first_name": "Test",
        "last_name": "Athlete",
        "email": "newathlete@example.com",
        "birth_date": "2000-01-01",
        "gender": "male",
        "primary_position": "Midfielder",
    }
    response = client.post("/api/v1/athletes/", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert body["invite_status"] == "sent"
    assert body["athlete_user_created"] is True
    athlete_id = body["athlete"]["id"]

    with Session(test_engine) as session:
        user = session.exec(select(User).where(User.email == "newathlete@example.com")).first()
        assert user is not None
        assert user.role == UserRole.ATHLETE
        assert user.athlete_id == athlete_id
        assert user.must_change_password is True
        assert user.athlete_status == UserAthleteApprovalStatus.APPROVED
        athlete = session.get(Athlete, athlete_id)
        assert athlete is not None
        code = session.exec(select(PasswordSetupCode).where(PasswordSetupCode.user_id == user.id)).first()
        assert code is not None


def test_create_athlete_conflict_when_user_exists(test_engine, monkeypatch):
    client = _make_client(monkeypatch, send_result=True)

    with Session(test_engine) as session:
        session.add(
            User(
                email="Conflict@Test.com",
                hashed_password="x",
                full_name="Existing",
                role=UserRole.COACH,
                is_active=True,
            )
        )
        session.commit()

    payload = {
        "first_name": "Dup",
        "last_name": "User",
        "email": "conflict@test.com",
        "birth_date": "2000-01-01",
        "gender": "male",
        "primary_position": "Midfielder",
    }
    response = client.post("/api/v1/athletes/", json=payload)
    assert response.status_code == 409
    assert (
        response.json()["detail"]
        == "A user with this email already exists. Please use a different email for the athlete."
    )

    with Session(test_engine) as session:
        athletes = session.exec(select(Athlete)).all()
        assert len(athletes) == 0


def test_create_athlete_without_email_returns_error(test_engine, monkeypatch):
    client = _make_client(monkeypatch, send_result=True)

    payload = {
        "first_name": "NoEmail",
        "last_name": "Athlete",
        "email": "",
        "birth_date": "2000-01-01",
        "gender": "male",
        "primary_position": "Midfielder",
    }
    response = client.post("/api/v1/athletes/", json=payload)
    assert response.status_code == 400
    assert (
        response.json()["detail"]
        == "Athletes must have an email address to create an account."
    )

    with Session(test_engine) as session:
        assert session.exec(select(User)).first() is None
        assert session.exec(select(Athlete)).first() is None


def _create_approved_athlete_user(
    engine,
    email: str,
    password: str,
    must_change_password: bool = True,
):
    with Session(engine) as session:
        athlete = Athlete(
            first_name="Auth",
            last_name="Test",
            email=email,
            phone="",
            birth_date=date(2000, 1, 1),
            gender="male",
            primary_position="Forward",
        )
        session.add(athlete)
        session.flush()

        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            full_name="Auth User",
            role=UserRole.ATHLETE,
            athlete_id=athlete.id,
            athlete_status=UserAthleteApprovalStatus.APPROVED,
            is_active=True,
            must_change_password=must_change_password,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user


def test_login_blocked_when_password_not_set(test_engine, monkeypatch):
    client = _make_client(monkeypatch, send_result=True)
    email = "locked@example.com"
    password = "Secret123!"
    _create_approved_athlete_user(test_engine, email, password, must_change_password=True)

    response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
        headers={"content-type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 403
    assert (
        response.json()["detail"] == "You must set your password before logging in."
    )


def test_password_reset_allows_login(test_engine, monkeypatch):
    async def fake_confirmation(*args, **kwargs):
        return True

    monkeypatch.setattr(
        email_service,
        "send_password_change_confirmation",
        fake_confirmation,
    )
    client = _make_client(monkeypatch, send_result=True)
    email = "ready@example.com"
    original_password = "Temp123!"
    new_password = "Ready456!"
    user = _create_approved_athlete_user(
        test_engine, email, original_password, must_change_password=True
    )
    token = security_token_manager.generate_token(
        {"sub": user.id, "scope": "password_reset"},
        salt=settings.PASSWORD_RESET_TOKEN_SALT,
    )

    confirm_response = client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": token, "new_password": new_password},
    )
    assert confirm_response.status_code == 200

    login_response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": new_password},
        headers={"content-type": "application/x-www-form-urlencoded"},
    )
    assert login_response.status_code == 200
    assert login_response.json().get("access_token")

    with Session(test_engine) as session:
        refreshed = session.exec(select(User).where(User.email == email)).first()
        assert refreshed.must_change_password is False
