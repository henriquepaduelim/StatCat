"""
Tests for authentication endpoints.
"""
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.user import User
from tests.conftest import get_auth_token


def test_login_success(client: TestClient, test_user: User):
    """Test successful login."""
    response = client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "testpass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_credentials(client: TestClient, test_user: User):
    """Test login with invalid credentials."""
    response = client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_login_nonexistent_user(client: TestClient):
    """Test login with non-existent user."""
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "nonexistent@example.com", "password": "anypass"},
    )
    assert response.status_code == 401


def test_register_new_user(client: TestClient, admin_user: User, session: Session):
    """Test user registration (admin-only endpoint)."""
    token = get_auth_token(client, admin_user.email, "adminpass123")
    response = client.post(
        "/api/v1/auth/register",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "email": "newuser@example.com",
            "password": "newpass123",
            "full_name": "New User",
            "phone": "1234567890",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["full_name"] == "New User"
    assert "id" in data


def test_register_duplicate_email(client: TestClient, admin_user: User, test_user: User):
    """Test registration with existing email (admin-only endpoint)."""
    token = get_auth_token(client, admin_user.email, "adminpass123")
    response = client.post(
        "/api/v1/auth/register",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "email": test_user.email,
            "password": "anypass123",
            "full_name": "Another User",
        },
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


def test_get_current_user(client: TestClient, test_user: User):
    """Test getting current user information."""
    # Get auth token
    response = client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "testpass123"},
    )
    token = response.json()["access_token"]
    
    # Get current user
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user.email
    assert data["full_name"] == test_user.full_name


def test_get_current_user_no_token(client: TestClient):
    """Test getting current user without token."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_get_current_user_invalid_token(client: TestClient):
    """Test getting current user with invalid token."""
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalidtoken123"},
    )
    assert response.status_code == 401
