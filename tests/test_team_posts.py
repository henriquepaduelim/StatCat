from datetime import date
import json
import zipfile
import io

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.athlete import Athlete, AthleteGender
from app.models.team import Team
from app.models.user import User
from tests.conftest import get_auth_token


def _create_team(session: Session, name: str = "Alpha FC") -> Team:
    team = Team(name=name, age_category="U15")
    session.add(team)
    session.commit()
    session.refresh(team)
    return team


def test_admin_can_create_and_list_team_posts(
    client: TestClient,
    session: Session,
    admin_user: User,
) -> None:
    team = _create_team(session)
    token = get_auth_token(client, admin_user.email, "adminpass123")

    create_response = client.post(
        f"/api/v1/teams/{team.id}/posts",
        data={"content": "Great work this week!"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["content"] == "Great work this week!"
    assert created["team_id"] == team.id
    assert created["author_id"] == admin_user.id

    list_response = client.get(
        f"/api/v1/teams/{team.id}/posts",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_response.status_code == 200
    posts = list_response.json()
    assert len(posts) == 1
    assert posts[0]["content"] == "Great work this week!"


def test_athlete_access_restricted_to_own_team(
    client: TestClient,
    session: Session,
    athlete_user: User,
    admin_user: User,
) -> None:
    athletes_team = _create_team(session, "Team A")
    other_team = _create_team(session, "Team B")

    athlete = Athlete(
        team_id=athletes_team.id,
        first_name="Alex",
        last_name="Striker",
        email="alex@example.com",
        phone="123456789",
        birth_date=date(2008, 5, 15),
        gender=AthleteGender.male,
        primary_position="forward",
    )
    session.add(athlete)
    session.commit()
    session.refresh(athlete)

    athlete_user.athlete_id = athlete.id
    session.add(athlete_user)
    session.commit()

    # Admin creates a post for the other team
    admin_token = get_auth_token(client, admin_user.email, "adminpass123")
    client.post(
        f"/api/v1/teams/{other_team.id}/posts",
        data={"content": "Game strategy update"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    athlete_token = get_auth_token(client, athlete_user.email, "athletepass123")

    forbidden_resp = client.get(
        f"/api/v1/teams/{other_team.id}/posts",
        headers={"Authorization": f"Bearer {athlete_token}"},
    )
    assert forbidden_resp.status_code == 403

    allowed_resp = client.get(
        f"/api/v1/teams/{athletes_team.id}/posts",
        headers={"Authorization": f"Bearer {athlete_token}"},
    )
    assert allowed_resp.status_code == 200
    assert allowed_resp.json() == []


def test_admin_can_export_and_cleanup_posts(
    client: TestClient,
    session: Session,
    admin_user: User,
) -> None:
    team = _create_team(session, "Exporters")
    token = get_auth_token(client, admin_user.email, "adminpass123")

    media_content = b"test-image-content"

    client.post(
        f"/api/v1/teams/{team.id}/posts",
        data={"content": "Photo update"},
        files={"media": ("photo.png", media_content, "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )

    export_resp = client.post(
        f"/api/v1/team-posts/export?team_id={team.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert export_resp.status_code == 200
    assert export_resp.headers["Content-Type"] == "application/zip"

    buffer = io.BytesIO(export_resp.content)
    with zipfile.ZipFile(buffer, "r") as zip_file:
        assert "posts.json" in zip_file.namelist()
        posts_payload = json.loads(zip_file.read("posts.json"))
        assert len(posts_payload) == 1
        assert posts_payload[0]["content"] == "Photo update"

    # Cleanup with delete_after
    cleanup_resp = client.post(
        f"/api/v1/team-posts/export?team_id={team.id}&delete_after=true",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert cleanup_resp.status_code == 200
    list_resp = client.get(
        f"/api/v1/teams/{team.id}/posts",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_resp.status_code == 200
    assert list_resp.json() == []
