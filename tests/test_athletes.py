"""
Tests for athlete CRUD operations.
"""
from datetime import date

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.security import get_password_hash
from app.models.athlete import Athlete, AthleteGender
from app.models.athlete_detail import AthleteDetail
from app.models.athlete_document import AthleteDocument
from app.models.athlete_payment import AthletePayment
from app.models.user import User, UserRole, UserAthleteApprovalStatus
from tests.conftest import get_auth_token


def _create_user(session: Session, *, email: str, role: UserRole) -> User:
    user = User(
        email=email,
        hashed_password=get_password_hash("secret123"),
        full_name="Temp User",
        role=role,
        is_active=True,
    )
    if role == UserRole.ATHLETE:
        user.athlete_status = UserAthleteApprovalStatus.APPROVED
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


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
            "birth_date": "2000-01-15",
            "gender": "male",
            "primary_position": "forward",
        },
    )
    assert response.status_code == 201
    data = response.json()
    
    # Assertions for the nested athlete data
    athlete_data = data["athlete"]
    assert athlete_data["first_name"] == "John"
    assert athlete_data["last_name"] == "Doe"
    assert athlete_data["email"] == "john.doe@example.com"
    assert "id" in athlete_data
    
    # Assertions for the top-level fields
    assert data["athlete_user_created"] is True
    assert data["invite_status"] in ["sent", "failed", "already_exists"]


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
        birth_date=date(2000, 1, 1),
        primary_position="forward",
    )
    athlete2 = Athlete(
        first_name="Bob",
        last_name="Jones",
        email="bob@example.com",
        gender=AthleteGender.male,
        birth_date=date(2000, 1, 2),
        primary_position="midfielder",
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
    assert "items" in data
    assert len(data["items"]) >= 2


def test_list_athletes_with_pagination(client: TestClient, session: Session, test_user: User):
    """Test listing athletes with pagination."""
    # Create multiple athletes
    for i in range(5):
        athlete = Athlete(
            first_name=f"Athlete{i}",
            last_name=f"Test{i}",
            email=f"athlete{i}@example.com",
            gender=AthleteGender.male,
            birth_date=date(2001, 1, i + 1),
            primary_position="defender",
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
    assert "items" in data
    assert len(data["items"]) <= 3


def test_list_athletes_rbac_coach_restricted(client: TestClient, session: Session):
    """Coach should only see athletes from linked teams."""
    # Create team and athlete linked to that team
    from app.models.team import Team, CoachTeamLink

    team_allowed = Team(name="Allowed", age_category="U15")
    session.add(team_allowed)
    session.commit()
    session.refresh(team_allowed)

    athlete_allowed = Athlete(
        first_name="Allowed",
        last_name="Athlete",
        email="allowed@example.com",
        gender=AthleteGender.male,
        birth_date=date(2005, 1, 1),
        team_id=team_allowed.id,
        primary_position="forward",
    )
    athlete_blocked = Athlete(
        first_name="Blocked",
        last_name="Athlete",
        email="blocked@example.com",
        gender=AthleteGender.male,
        birth_date=date(2005, 2, 1),
        team_id=None,
        primary_position="forward",
    )
    session.add(athlete_allowed)
    session.add(athlete_blocked)
    session.commit()

    coach_user = _create_user(session, email="coach_rbac@example.com", role=UserRole.COACH)
    session.add(CoachTeamLink(user_id=coach_user.id, team_id=team_allowed.id))
    session.commit()

    token = get_auth_token(client, coach_user.email, "secret123")
    response = client.get(
        "/api/v1/athletes/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert all(item["team_id"] == team_allowed.id for item in data["items"])


def test_list_athletes_rbac_athlete_self_only(client: TestClient, session: Session):
    """Athlete should only see their own record."""
    athlete = Athlete(
        first_name="Self",
        last_name="View",
        email="self@example.com",
        gender=AthleteGender.male,
        birth_date=date(2004, 3, 3),
        primary_position="forward",
    )
    session.add(athlete)
    session.commit()
    session.refresh(athlete)

    athlete_user = _create_user(session, email="selfuser@example.com", role=UserRole.ATHLETE)
    athlete_user.athlete_id = athlete.id
    session.add(athlete_user)
    session.commit()

    token = get_auth_token(client, athlete_user.email, "secret123")
    response = client.get(
        "/api/v1/athletes/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["id"] == athlete.id


def test_approve_athlete_as_admin(client: TestClient, session: Session, admin_user: User):
    """Admin should approve a pending athlete."""
    athlete = Athlete(
        first_name="Pending",
        last_name="Athlete",
        email="pending@example.com",
        gender=AthleteGender.male,
        birth_date=date(2003, 1, 1),
        primary_position="goalkeeper",
    )
    session.add(athlete)
    session.commit()
    session.refresh(athlete)

    user = _create_user(session, email="pendinguser@example.com", role=UserRole.ATHLETE)
    user.athlete_id = athlete.id
    user.athlete_status = UserAthleteApprovalStatus.PENDING
    session.add(user)
    session.commit()

    token = get_auth_token(client, admin_user.email, "adminpass123")
    response = client.post(
        f"/api/v1/athletes/{athlete.id}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    updated_user = session.exec(select(User).where(User.id == user.id)).first()
    assert updated_user.athlete_status == UserAthleteApprovalStatus.APPROVED


def test_approve_athlete_forbidden_for_coach(client: TestClient, session: Session):
    """Coach should not be able to approve athletes."""
    coach = _create_user(session, email="coachapprover@example.com", role=UserRole.COACH)
    athlete = Athlete(
        first_name="Pending",
        last_name="Athlete",
        email="pending2@example.com",
        gender=AthleteGender.male,
        birth_date=date(2003, 2, 2),
        primary_position="goalkeeper",
    )
    session.add(athlete)
    session.commit()
    session.refresh(athlete)

    user = _create_user(session, email="pendinguser2@example.com", role=UserRole.ATHLETE)
    user.athlete_id = athlete.id
    user.athlete_status = UserAthleteApprovalStatus.PENDING
    session.add(user)
    session.commit()

    token = get_auth_token(client, coach.email, "secret123")
    response = client.post(
        f"/api/v1/athletes/{athlete.id}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_get_athlete(client: TestClient, session: Session, test_user: User):
    """Test getting a specific athlete."""
    athlete = Athlete(
        first_name="Jane",
        last_name="Doe",
        email="jane@example.com",
        gender=AthleteGender.female,
        birth_date=date(2000, 5, 5),
        primary_position="midfielder",
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
        birth_date=date(1999, 9, 9),
        primary_position="defender",
    )
    session.add(athlete)
    session.commit()
    session.refresh(athlete)
    
    token = get_auth_token(client, admin_user.email, "adminpass123")
    
    response = client.patch(
        f"/api/v1/athletes/{athlete.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "first_name": "Updated",
            "last_name": "Name",
            "email": "updated@example.com",
            "gender": "male",
            "primary_position": "forward",
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
        birth_date=date(1998, 8, 8),
        primary_position="forward",
    )
    session.add(athlete)
    session.commit()
    session.refresh(athlete)

    # Attach related rows that reference athlete_id
    session.add(AthleteDocument(athlete_id=athlete.id, label="ID", file_url="/media/doc"))
    session.add(AthletePayment(athlete_id=athlete.id, amount=100, currency="USD"))
    session.add(AthleteDetail(athlete_id=athlete.id, email="detail@example.com", primary_position="forward"))
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

    linked_id = linked_user.id

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
    assert session.exec(select(User).where(User.id == linked_id)).first() is None


def test_delete_athlete_forbidden(client: TestClient, session: Session, athlete_user: User):
    """Test that regular athlete cannot delete athletes."""
    athlete = Athlete(
        first_name="Protected",
        last_name="User",
        email="protected@example.com",
        gender=AthleteGender.male,
        birth_date=date(2000, 1, 1),
        primary_position="forward",
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
        primary_position="goalkeeper",
    )
    incomplete_athlete = Athlete(
        first_name="Incomplete",
        last_name="Athlete",
        email="incomplete@example.com",
        gender=AthleteGender.female,
        birth_date=date(2006, 2, 2),
        primary_position="midfielder",
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