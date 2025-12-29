from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.user import User, UserRole
from app.core.security import get_password_hash


def _admin_token(client: TestClient, email: str, password: str) -> str:
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_admin_creates_coach_active_and_requires_password_setup(
    client: TestClient, admin_user: User, session: Session
):
    token = _admin_token(client, admin_user.email, "adminpass123")
    resp = client.post(
        "/api/v1/auth/register",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "email": "newcoach@example.com",
            "password": "TempPass!234",
            "full_name": "Coach New",
            "phone": "123",
            "role": "COACH",
            "is_active": True,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["role"] == "COACH"
    assert data["is_active"] is True
    assert data["athlete_status"] is None
    assert data["must_change_password"] is False

    created = session.exec(select(User).where(User.email == "newcoach@example.com")).first()
    assert created is not None
    assert created.role == UserRole.COACH
    assert created.is_active is True
    assert created.athlete_status is None
    assert created.must_change_password is False


def test_login_requires_password_setup_for_coach(client: TestClient, session: Session):
    coach = User(
        email="coach_pending@example.com",
        hashed_password=get_password_hash("Temp1234"),
        full_name="Coach Pending",
        role=UserRole.COACH,
        is_active=True,
        must_change_password=False,
    )
    session.add(coach)
    session.commit()
    session.refresh(coach)

    resp = client.post(
        "/api/v1/auth/login",
        data={"username": coach.email, "password": "Temp1234"},
    )
    assert resp.status_code == 403
    detail = resp.json().get("detail")
    assert isinstance(detail, dict)
    assert detail.get("requires_password_setup") is True
