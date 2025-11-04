"""
Tests for team CRUD operations.
"""
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.user import User
from app.models.team import Team
from tests.conftest import get_auth_token


def test_create_team(client: TestClient, admin_user: User):
    """Test creating a team."""
    token = get_auth_token(client, admin_user.email, "adminpass123")
    
    response = client.post(
        "/api/v1/teams/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "U17 Boys",
            "age_category": "U17",
            "description": "Under 17 boys team",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "U17 Boys"
    assert data["age_category"] == "U17"
    assert "id" in data


def test_list_teams(client: TestClient, session: Session, test_user: User):
    """Test listing teams."""
    # Create test teams
    team1 = Team(name="Team A", age_category="U15", created_by_id=test_user.id)
    team2 = Team(name="Team B", age_category="U17", created_by_id=test_user.id)
    session.add(team1)
    session.add(team2)
    session.commit()
    
    token = get_auth_token(client, test_user.email, "testpass123")
    
    response = client.get(
        "/api/v1/teams/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2


def test_list_teams_with_pagination(client: TestClient, session: Session, test_user: User):
    """Test listing teams with pagination."""
    # Create multiple teams
    for i in range(5):
        team = Team(
            name=f"Team {i}",
            age_category=f"U{15+i}",
            created_by_id=test_user.id,
        )
        session.add(team)
    session.commit()
    
    token = get_auth_token(client, test_user.email, "testpass123")
    
    response = client.get(
        "/api/v1/teams/?page=1&size=3",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) <= 3


def test_get_team(client: TestClient, session: Session, test_user: User):
    """Test getting a specific team."""
    team = Team(name="Test Team", age_category="U19", created_by_id=test_user.id)
    session.add(team)
    session.commit()
    session.refresh(team)
    
    token = get_auth_token(client, test_user.email, "testpass123")
    
    response = client.get(
        f"/api/v1/teams/{team.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == team.id
    assert data["name"] == "Test Team"


def test_filter_teams_by_age_category(client: TestClient, session: Session, test_user: User):
    """Test filtering teams by age category."""
    team1 = Team(name="U15 Team", age_category="U15", created_by_id=test_user.id)
    team2 = Team(name="U17 Team", age_category="U17", created_by_id=test_user.id)
    session.add(team1)
    session.add(team2)
    session.commit()
    
    token = get_auth_token(client, test_user.email, "testpass123")
    
    response = client.get(
        "/api/v1/teams/?age_category=U15",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert all(team["age_category"] == "U15" for team in data)
