from datetime import date

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.athlete import Athlete, AthleteGender, AthleteStatus
from app.models.match_stat import MatchStat
from app.models.team import Team
from tests.conftest import get_auth_token


def _create_team(session: Session, admin_id: int) -> Team:
    team = Team(name="Academy U14", age_category="U14", description="Test", created_by_id=admin_id)
    session.add(team)
    session.commit()
    session.refresh(team)
    return team


def _create_athlete(session: Session, team_id: int, idx: int) -> Athlete:
    athlete = Athlete(
        first_name=f"Athlete{idx}",
        last_name="Tester",
        email=f"athlete{idx}@example.com",
        phone=None,
        birth_date=date(2010, 1, 1),
        team_id=team_id,
        gender=AthleteGender.male,
        primary_position="forward" if idx == 1 else "goalkeeper",
        status=AthleteStatus.active,
    )
    session.add(athlete)
    session.commit()
    session.refresh(athlete)
    return athlete


def test_admin_can_submit_game_report(
    client: TestClient,
    session: Session,
    admin_user,
) -> None:
    token = get_auth_token(client, admin_user.email, "adminpass123")
    team = _create_team(session, admin_user.id)
    scorer = _create_athlete(session, team.id, 1)
    keeper = _create_athlete(session, team.id, 2)

    payload = {
        "team_id": team.id,
        "opponent": "Rivals FC",
        "date": "2024-11-11",
        "location": "Main Stadium",
        "goals_for": 2,
        "goals_against": 1,
        "goal_scorers": [{"athlete_id": scorer.id, "goals": 2, "shootout_goals": 1}],
        "goalkeepers": [{"athlete_id": keeper.id, "conceded": 1}],
        "notes": "Quarter-final",
    }

    response = client.post(
        "/api/v1/match-stats/reports",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    assert response.json()["created_entries"] == 2

    stats = session.exec(select(MatchStat)).all()
    assert len(stats) == 2
    scorer_stat = next(stat for stat in stats if stat.athlete_id == scorer.id)
    keeper_stat = next(stat for stat in stats if stat.athlete_id == keeper.id)
    assert scorer_stat.goals == 2
    assert scorer_stat.goals_conceded == 0
    assert keeper_stat.goals == 0
    assert keeper_stat.goals_conceded == 1

    leaderboard = client.get(
        "/api/v1/analytics/leaderboards/scoring",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert leaderboard.status_code == 200
    entries = leaderboard.json()["entries"]
    assert any(entry["athlete_id"] == scorer.id and entry["goals"] == 2 for entry in entries)
    shootout_board = client.get(
        "/api/v1/analytics/leaderboards/scoring?leaderboard_type=shootouts",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert shootout_board.status_code == 200
    shootout_entries = shootout_board.json()["entries"]
    assert any(entry["athlete_id"] == scorer.id and entry["shootout_goals"] == 1 for entry in shootout_entries)
    pending = client.get(
        "/api/v1/report-submissions/pending",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert pending.status_code == 200
    assert any(item["report_type"] == "game_report" for item in pending.json())
    mine = client.get(
        "/api/v1/report-submissions/mine",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert mine.status_code == 200
    assert any(item["id"] for item in mine.json())


def test_athlete_cannot_submit_game_report(
    client: TestClient,
    session: Session,
    athlete_user,
) -> None:
    token = get_auth_token(client, athlete_user.email, "athletepass123")
    response = client.post(
        "/api/v1/match-stats/reports",
        json={
            "team_id": None,
            "opponent": "Rivals",
            "date": "2024-11-11",
            "goal_scorers": [],
            "goalkeepers": [],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_mismatched_totals_raise_error(
    client: TestClient,
    session: Session,
    admin_user,
) -> None:
    token = get_auth_token(client, admin_user.email, "adminpass123")
    team = _create_team(session, admin_user.id)
    scorer = _create_athlete(session, team.id, 5)
    keeper = _create_athlete(session, team.id, 6)

    payload = {
        "team_id": team.id,
        "opponent": "Mismatch FC",
        "date": "2024-11-11",
        "goals_for": 3,
        "goals_against": 2,
        "goal_scorers": [{"athlete_id": scorer.id, "goals": 1}],
        "goalkeepers": [{"athlete_id": keeper.id, "conceded": 1}],
    }

    response = client.post(
        "/api/v1/match-stats/reports",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400


def test_pending_submission_approval_flow(
    client: TestClient,
    session: Session,
    admin_user,
) -> None:
    token = get_auth_token(client, admin_user.email, "adminpass123")
    team = _create_team(session, admin_user.id)
    scorer = _create_athlete(session, team.id, 7)
    keeper = _create_athlete(session, team.id, 8)

    payload = {
        "team_id": team.id,
        "opponent": "Final FC",
        "date": "2024-11-11",
        "goals_for": 1,
        "goals_against": 0,
        "goal_scorers": [{"athlete_id": scorer.id, "goals": 1}],
        "goalkeepers": [{"athlete_id": keeper.id, "conceded": 0}],
    }
    response = client.post(
        "/api/v1/match-stats/reports",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201

    pending = client.get(
        "/api/v1/report-submissions/pending",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert pending.status_code == 200
    data = pending.json()
    assert len(data) >= 1
    submission_id = data[0]["id"]

    approve = client.post(
        f"/api/v1/report-submissions/{submission_id}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert approve.status_code == 200

    pending_after = client.get(
        "/api/v1/report-submissions/pending",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert all(item["id"] != submission_id for item in pending_after.json())


def test_leaderboard_filter_by_team(
    client: TestClient,
    session: Session,
    admin_user,
) -> None:
    token = get_auth_token(client, admin_user.email, "adminpass123")
    team_one = _create_team(session, admin_user.id)
    team_two = _create_team(session, admin_user.id)
    scorer_one = _create_athlete(session, team_one.id, 11)
    scorer_two = _create_athlete(session, team_two.id, 12)

    payload_one = {
        "team_id": team_one.id,
        "opponent": "Opponent A",
        "date": "2024-10-10",
        "goals_for": 3,
        "goals_against": 0,
        "goal_scorers": [{"athlete_id": scorer_one.id, "goals": 3}],
        "goalkeepers": [],
    }
    payload_two = {
        "team_id": team_two.id,
        "opponent": "Opponent B",
        "date": "2024-10-11",
        "goals_for": 1,
        "goals_against": 0,
        "goal_scorers": [{"athlete_id": scorer_two.id, "goals": 1}],
        "goalkeepers": [],
    }

    client.post(
        "/api/v1/match-stats/reports",
        json=payload_one,
        headers={"Authorization": f"Bearer {token}"},
    )
    client.post(
        "/api/v1/match-stats/reports",
        json=payload_two,
        headers={"Authorization": f"Bearer {token}"},
    )

    leaderboard_team_one = client.get(
        f"/api/v1/analytics/leaderboards/scoring?team_id={team_one.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert leaderboard_team_one.status_code == 200
    entries_one = leaderboard_team_one.json()["entries"]
    assert entries_one == [
        {
            "athlete_id": scorer_one.id,
            "full_name": f"{scorer_one.first_name} {scorer_one.last_name}",
            "team": team_one.name,
            "age_category": team_one.age_category,
            "position": scorer_one.primary_position,
            "goals": 3,
            "clean_sheets": 0,
            "games_played": 0,
            "goals_conceded": 0,
        }
    ]

    leaderboard_team_two = client.get(
        f"/api/v1/analytics/leaderboards/scoring?team_id={team_two.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert leaderboard_team_two.status_code == 200
    entries_two = leaderboard_team_two.json()["entries"]
    assert entries_two == [
        {
            "athlete_id": scorer_two.id,
            "full_name": f"{scorer_two.first_name} {scorer_two.last_name}",
            "team": team_two.name,
            "age_category": team_two.age_category,
            "position": scorer_two.primary_position,
            "goals": 1,
            "clean_sheets": 0,
            "games_played": 0,
            "goals_conceded": 0,
        }
    ]
