import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine, select

from app.api.deps import get_current_active_user
from app.db.session import get_session
from app.main import app
from app.core.security import get_password_hash
from app.models.user import User, UserRole, UserAthleteApprovalStatus
from app.models.password_setup_code import PasswordSetupCode
from app.services.email_service import email_service


@pytest.fixture
def test_engine(tmp_path):
    db_path = tmp_path / "test_codes.db"
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


def _create_user_with_code(engine, email: str):
    with Session(engine) as session:
        user = User(
            email=email,
            hashed_password=get_password_hash("temp"),
            full_name="New User",
            role=UserRole.ATHLETE,
            athlete_status=UserAthleteApprovalStatus.APPROVED,
            must_change_password=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user


def test_password_code_flow_success(monkeypatch, test_engine):
    async def fake_send_password_code(*args, **kwargs):
        return True

    from app.api.v1.endpoints import auth as auth_endpoints

    monkeypatch.setattr(auth_endpoints.email_service, "send_password_code", fake_send_password_code)
    client = TestClient(app)
    user = _create_user_with_code(test_engine, "codeuser@example.com")

    # request code
    resp = client.post(
        "/api/v1/auth/password-code/request", json={"email": user.email}
    )
    assert resp.status_code == 202

    with Session(test_engine) as session:
        record = session.exec(
            select(PasswordSetupCode).where(PasswordSetupCode.user_id == user.id)
        ).first()
        assert record is not None
        # For testing, we can't read the code; simulate verify/confirm using stored hash by re-requesting

    # Since verify requires code, create a new one and capture via monkeypatch
    captured = {}

    async def capture_code(to_email, to_name, code, expires_minutes):
        captured["code"] = code
        return True

    monkeypatch.setattr(auth_endpoints.email_service, "send_password_code", capture_code)
    client.post("/api/v1/auth/password-code/request", json={"email": user.email})
    code = captured["code"]

    verify_resp = client.post(
        "/api/v1/auth/password-code/verify",
        json={"email": user.email, "code": code},
    )
    assert verify_resp.status_code == 200
    token = verify_resp.json()["detail"]
    assert token

    confirm_resp = client.post(
        "/api/v1/auth/password-code/confirm",
        json={"email": user.email, "code": code, "new_password": "NewPass123!"},
    )
    assert confirm_resp.status_code == 200

    # login should succeed and must_change_password should be cleared
    login_resp = client.post(
        "/api/v1/auth/login",
        data={"username": user.email, "password": "NewPass123!"},
        headers={"content-type": "application/x-www-form-urlencoded"},
    )
    assert login_resp.status_code == 200
    assert login_resp.json()["must_change_password"] is False


def test_password_code_rejects_invalid(monkeypatch, test_engine):
    async def fake_send_password_code(*args, **kwargs):
        return True

    from app.api.v1.endpoints import auth as auth_endpoints

    monkeypatch.setattr(auth_endpoints.email_service, "send_password_code", fake_send_password_code)
    client = TestClient(app)
    user = _create_user_with_code(test_engine, "badcode@example.com")
    client.post("/api/v1/auth/password-code/request", json={"email": user.email})

    verify_resp = client.post(
        "/api/v1/auth/password-code/verify",
        json={"email": user.email, "code": "000000"},
    )
    assert verify_resp.status_code == 400
