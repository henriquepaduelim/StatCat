"""
Pytest configuration and fixtures for testing.
"""
import os
from collections import defaultdict
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

# Ensure tests always use in-memory SQLite, regardless of local .env
os.environ.setdefault("DATABASE_URL", "sqlite://")

from app.main import app
from app.db.session import get_session
from app.models.user import User, UserRole, UserAthleteApprovalStatus
from app.core.security import get_password_hash
from app.services.email_service import EmailService, email_service as services_email_service
from app.api.v1.endpoints import auth as auth_module


# Use in-memory SQLite for testing
TEST_DATABASE_URL = "sqlite://"


@pytest.fixture(name="session")
def session_fixture() -> Generator[Session, None, None]:
    """Create a fresh database session for each test."""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        yield session
    
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="client")
def client_fixture(session: Session, fake_mailbox) -> Generator[TestClient, None, None]:
    """Create a test client with database session override."""
    def get_session_override():
        return session
    
    app.dependency_overrides[get_session] = get_session_override
    
    with TestClient(app) as client:
        yield client
    
    app.dependency_overrides.clear()


@pytest.fixture(name="test_user")
def test_user_fixture(session: Session) -> User:
    """Create a test user."""
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("testpass123"),
        full_name="Test User",
        role=UserRole.STAFF,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="admin_user")
def admin_user_fixture(session: Session) -> User:
    """Create an admin user."""
    user = User(
        email="admin@example.com",
        hashed_password=get_password_hash("adminpass123"),
        full_name="Admin User",
        role=UserRole.ADMIN,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="athlete_user")
def athlete_user_fixture(session: Session) -> User:
    """Create an athlete user."""
    user = User(
        email="athlete@example.com",
        hashed_password=get_password_hash("athletepass123"),
        full_name="Athlete User",
        role=UserRole.ATHLETE,
        is_active=True,
        athlete_status=UserAthleteApprovalStatus.APPROVED,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def get_auth_token(client: TestClient, email: str, password: str) -> str:
    """Helper to get authentication token."""
    response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture(autouse=True)
def fake_mailbox(monkeypatch: pytest.MonkeyPatch):
    """
    Capture outbound email calls by monkeypatching EmailService methods.
    """
    sent: dict[str, list[dict[str, object]]] = defaultdict(list)

    def _append_email(to_email: str, subject: str, body: str = "", html: str | None = None) -> bool:
        sent["emails"].append({"to": to_email, "subject": subject, "body": body, "html": html})
        return True

    async def _record_email(self, to_email: str, subject: str, body: str) -> bool:  # noqa: ANN001
        return _append_email(to_email, subject, body)

    async def _record_email_four(self, to_email: str, subject: str, body: str, html_body: str | None = None) -> bool:  # noqa: ANN001
        return _append_email(to_email, subject, body, html_body)

    async def _mock_registration_pending(self, to_email: str, **kwargs):  # noqa: ANN001
        return _append_email(to_email, "We received your registration")

    async def _mock_account_approved(self, to_email: str, to_name: str | None = None, **kwargs):  # noqa: ANN001
        return _append_email(to_email, "Your account is approved")

    async def _mock_welcome(self, to_email: str, to_name: str | None = None, **kwargs):  # noqa: ANN001
        return _append_email(to_email, "Welcome to StatCat")

    async def _mock_event_invite(self, to_email: str, **kwargs):  # noqa: ANN001
        return _append_email(to_email, "You're invited")

    async def _mock_event_update(self, to_email: str, **kwargs):  # noqa: ANN001
        return _append_email(to_email, "Event updated")

    async def _mock_event_reminder(self, to_email: str, **kwargs):  # noqa: ANN001
        return _append_email(to_email, "Reminder")

    async def _mock_confirmation(self, to_email: str, **kwargs):  # noqa: ANN001
        return _append_email(to_email, "Confirmed")

    async def _mock_confirmation_receipt(self, to_email: str, status: str | None = None, **kwargs):  # noqa: ANN001
        subject = f"{status or 'confirmed'}"
        return _append_email(to_email, subject)

    async def _mock_report_ready(self, to_email: str, **kwargs):  # noqa: ANN001
        return _append_email(to_email, "Report card is ready")

    # Patch low-level sender and mark configured
    monkeypatch.setattr(EmailService, "_send_email", _record_email_four)
    monkeypatch.setattr(EmailService, "send_registration_pending", _mock_registration_pending, raising=False)
    monkeypatch.setattr(EmailService, "send_account_approved", _mock_account_approved, raising=False)
    monkeypatch.setattr(EmailService, "send_welcome_email", _mock_welcome, raising=False)
    monkeypatch.setattr(EmailService, "send_event_invitation", _mock_event_invite, raising=False)
    monkeypatch.setattr(EmailService, "send_event_update", _mock_event_update, raising=False)
    monkeypatch.setattr(EmailService, "send_event_reminder", _mock_event_reminder, raising=False)
    monkeypatch.setattr(EmailService, "send_confirmation_received", _mock_confirmation, raising=False)
    monkeypatch.setattr(EmailService, "send_confirmation_receipt", _mock_confirmation_receipt, raising=False)
    monkeypatch.setattr(EmailService, "send_report_ready", _mock_report_ready, raising=False)
    for instance in (services_email_service, getattr(auth_module, "email_service", None)):
        if instance:
            instance.is_configured = True

    return sent
