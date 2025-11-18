"""
Tests for athlete CRUD operations.
"""
from datetime import date

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.security import get_password_hash
from app.models.athlete import Athlete, AthleteDetail, AthleteDocument, AthleteGender, AthletePayment
from app.models.user import User, UserRole, UserAthleteApprovalStatus
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
    """Deleting an athlete should remove dependent rows and return 204."""
    athlete = Athlete(
        first_name="ToDelete",
        last_name="User",
        email="delete@example.com",
        gender=AthleteGender.male,
    )
    session.add(athlete)
    session.commit()
    session.refresh(athlete)

    # Attach related rows that reference athlete_id
    session.add(AthleteDocument(athlete_id=athlete.id, label="ID", file_url="/media/doc"))
    session.add(AthletePayment(athlete_id=athlete.id, amount=100, currency="USD"))
    session.add(AthleteDetail(athlete_id=athlete.id, email="detail@example.com"))
    linked_user = User(
        email="linked@example.com",
        hashed_password=get_password_hash("linkedpass123"),
        full_name="Linked Athlete",
        role=UserRole.ATHLETE,
        athlete_id=athlete.id,
        athlete_status=UserAthleteApprovalStatus.APPROVED,
        is_active=True,
    )
    session.add(linked_user)
    session.commit()

    token = get_auth_token(client, admin_user.email, "adminpass123")

    response = client.delete(
        f"/api/v1/athletes/{athlete.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 204

    # Verify athlete and linked rows are gone
    response = client.get(
        f"/api/v1/athletes/{athlete.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404
    assert session.get(Athlete, athlete.id) is None
    assert session.exec(select(User).where(User.id == linked_user.id)).first() is None


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


def test_approve_all_pending_athletes(client: TestClient, session: Session, admin_user: User):
    """Bulk approval should approve every pending or incomplete athlete user."""
    pending_athlete = Athlete(
        first_name="Pending",
        last_name="Athlete",
        email="pending@example.com",
        gender=AthleteGender.male,
        birth_date=date(2005, 1, 1),
    )
    incomplete_athlete = Athlete(
        first_name="Incomplete",
        last_name="Athlete",
        email="incomplete@example.com",
        gender=AthleteGender.female,
        birth_date=date(2006, 2, 2),
    )
    session.add(pending_athlete)
    session.add(incomplete_athlete)
    session.commit()
    session.refresh(pending_athlete)
    session.refresh(incomplete_athlete)

    pending_user = User(
        email="pending_user@example.com",
        hashed_password=get_password_hash("testpass123"),
        full_name="Pending User",
        role=UserRole.ATHLETE,
        athlete_id=pending_athlete.id,
        athlete_status=UserAthleteApprovalStatus.PENDING,
        is_active=True,
    )
    incomplete_user = User(
        email="incomplete_user@example.com",
        hashed_password=get_password_hash("testpass123"),
        full_name="Incomplete User",
        role=UserRole.ATHLETE,
        athlete_id=incomplete_athlete.id,
        athlete_status=UserAthleteApprovalStatus.INCOMPLETE,
        is_active=True,
    )
    session.add(pending_user)
    session.add(incomplete_user)
    session.commit()

    token = get_auth_token(client, admin_user.email, "adminpass123")
    response = client.post(
        "/api/v1/athletes/approve-all",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json() == {"approved": 2, "skipped": 0}

    session.refresh(pending_user)
    session.refresh(incomplete_user)
    assert pending_user.athlete_status == UserAthleteApprovalStatus.APPROVED
    assert incomplete_user.athlete_status == UserAthleteApprovalStatus.APPROVED
