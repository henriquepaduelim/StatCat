"""
Pytest configuration and fixtures for testing.
"""
import os
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.db.session import get_session
from app.models.user import User, UserRole
from app.core.security import get_password_hash


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
def client_fixture(session: Session) -> Generator[TestClient, None, None]:
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
