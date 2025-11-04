"""
Tests for athlete CRUD operations.
"""
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.user import User
from app.models.athlete import Athlete, AthleteGender
from tests.conftest import get_auth_token


def test_create_athlete(client: TestClient, admin_user: User):
    """Test creating an athlete."""
    token = get_auth_token(client, admin_user.email, "adminpass123")
    
    response = client.post(
        "/api/v1/athletes/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "date_of_birth": "2000-01-15",
            "gender": "male",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["first_name"] == "John"
    assert data["last_name"] == "Doe"
    assert data["email"] == "john.doe@example.com"
    assert "id" in data


def test_create_athlete_unauthorized(client: TestClient):
    """Test creating athlete without authentication."""
    response = client.post(
        "/api/v1/athletes/",
        json={
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "date_of_birth": "2000-01-15",
            "gender": "male",
        },
    )
    assert response.status_code == 401


def test_list_athletes(client: TestClient, session: Session, test_user: User):
    """Test listing athletes."""
    # Create test athletes
    athlete1 = Athlete(
        first_name="Alice",
        last_name="Smith",
        email="alice@example.com",
        gender=AthleteGender.female,
    )
    athlete2 = Athlete(
        first_name="Bob",
        last_name="Jones",
        email="bob@example.com",
        gender=AthleteGender.male,
    )
    session.add(athlete1)
    session.add(athlete2)
    session.commit()
    
    token = get_auth_token(client, test_user.email, "testpass123")
    
    response = client.get(
        "/api/v1/athletes/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2


def test_list_athletes_with_pagination(client: TestClient, session: Session, test_user: User):
    """Test listing athletes with pagination."""
    # Create multiple athletes
    for i in range(5):
        athlete = Athlete(
            first_name=f"Athlete{i}",
            last_name=f"Test{i}",
            email=f"athlete{i}@example.com",
            gender=AthleteGender.male,
        )
        session.add(athlete)
    session.commit()
    
    token = get_auth_token(client, test_user.email, "testpass123")
    
    # Test pagination
    response = client.get(
        "/api/v1/athletes/?page=1&size=3",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) <= 3


def test_get_athlete(client: TestClient, session: Session, test_user: User):
    """Test getting a specific athlete."""
    athlete = Athlete(
        first_name="Jane",
        last_name="Doe",
        email="jane@example.com",
        gender=AthleteGender.female,
    )
    session.add(athlete)
    session.commit()
    session.refresh(athlete)
    
    token = get_auth_token(client, test_user.email, "testpass123")
    
    response = client.get(
        f"/api/v1/athletes/{athlete.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == athlete.id
    assert data["first_name"] == "Jane"
    assert data["last_name"] == "Doe"


def test_get_nonexistent_athlete(client: TestClient, test_user: User):
    """Test getting a non-existent athlete."""
    token = get_auth_token(client, test_user.email, "testpass123")
    
    response = client.get(
        "/api/v1/athletes/99999",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404


def test_update_athlete(client: TestClient, session: Session, admin_user: User):
    """Test updating an athlete."""
    athlete = Athlete(
        first_name="Original",
        last_name="Name",
        email="original@example.com",
        gender=AthleteGender.male,
    )
    session.add(athlete)
    session.commit()
    session.refresh(athlete)
    
    token = get_auth_token(client, admin_user.email, "adminpass123")
    
    response = client.put(
        f"/api/v1/athletes/{athlete.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "first_name": "Updated",
            "last_name": "Name",
            "email": "updated@example.com",
            "gender": "male",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "Updated"
    assert data["email"] == "updated@example.com"


def test_delete_athlete(client: TestClient, session: Session, admin_user: User):
    """Test deleting an athlete."""
    athlete = Athlete(
        first_name="ToDelete",
        last_name="User",
        email="delete@example.com",
        gender=AthleteGender.male,
    )
    session.add(athlete)
    session.commit()
    session.refresh(athlete)
    
    token = get_auth_token(client, admin_user.email, "adminpass123")
    
    response = client.delete(
        f"/api/v1/athletes/{athlete.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    
    # Verify deletion
    response = client.get(
        f"/api/v1/athletes/{athlete.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404


def test_delete_athlete_forbidden(client: TestClient, session: Session, athlete_user: User):
    """Test that regular athlete cannot delete athletes."""
    athlete = Athlete(
        first_name="Protected",
        last_name="User",
        email="protected@example.com",
        gender=AthleteGender.male,
    )
    session.add(athlete)
    session.commit()
    session.refresh(athlete)
    
    token = get_auth_token(client, athlete_user.email, "athletepass123")
    
    response = client.delete(
        f"/api/v1/athletes/{athlete.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
