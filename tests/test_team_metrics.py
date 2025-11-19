from datetime import datetime

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.team import Team
from app.models.user import User, UserRole
from tests.conftest import get_auth_token


def _create_team(session: Session) -> Team:
    team = Team(name="Metrics FC", age_category="U15")
    session.add(team)
    session.commit()
    session.refresh(team)
    return team


def test_create_and_list_team_combine_metrics(
    client: TestClient,
    session: Session,
    admin_user: User,
) -> None:
    team = _create_team(session)
    token = get_auth_token(client, admin_user.email, "adminpass123")

    payload = {
        "athlete_id": None,
        "sitting_height_cm": 85.5,
        "standing_height_cm": 150.2,
        "weight_kg": 55.3,
        "split_10m_s": 1.8,
        "split_20m_s": 3.2,
        "split_35m_s": 5.1,
        "yoyo_distance_m": 1200,
        "jump_cm": 45,
        "max_power_kmh": 25.5,
    }
    response = client.post(
        f"/api/v1/teams/{team.id}/combine-metrics",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    created = response.json()
    assert created["team_id"] == team.id
    assert created["recorded_by_id"] == admin_user.id
    assert created["jump_cm"] == 45

    list_response = client.get(
        f"/api/v1/teams/{team.id}/combine-metrics",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_response.status_code == 200
    data = list_response.json()
    assert len(data) == 1
    assert data[0]["sitting_height_cm"] == 85.5
