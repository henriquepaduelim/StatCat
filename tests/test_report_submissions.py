from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.athlete import Athlete, AthleteGender
from app.models.report_submission import (
  ReportSubmission,
  ReportSubmissionStatus,
  ReportSubmissionType,
)
from app.models.team import CoachTeamLink, Team
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from tests.conftest import get_auth_token


def _create_team(session: Session, name: str = "Team A") -> Team:
  team = Team(name=name, age_category="U15", description="Test team")
  session.add(team)
  session.commit()
  session.refresh(team)
  return team


def _create_athlete(session: Session, team_id: int | None = None) -> Athlete:
  athlete = Athlete(
    first_name="John",
    last_name="Doe",
    email="athlete1@example.com",
    birth_date=date(2010, 1, 1),
    gender=AthleteGender.male,
    team_id=team_id,
    primary_position="GK",
  )
  session.add(athlete)
  session.commit()
  session.refresh(athlete)
  return athlete


def _auth_token_for_user(session: Session, client: TestClient, email: str, role: UserRole) -> str:
  user = User(
    email=email,
    hashed_password=get_password_hash("secret123"),
    full_name="Test User",
    role=role,
    is_active=True,
  )
  session.add(user)
  session.commit()
  return get_auth_token(client, email, "secret123")


def _create_submission(
  session: Session,
  *,
  status: ReportSubmissionStatus = ReportSubmissionStatus.PENDING,
  team_id: int | None,
  athlete_id: int | None,
  submitted_by_id: int,
) -> ReportSubmission:
  submission = ReportSubmission(
    report_type=ReportSubmissionType.REPORT_CARD,
    status=status,
    submitted_by_id=submitted_by_id,
    team_id=team_id,
    athlete_id=athlete_id,
    coach_report="Notes",
    general_notes="Notes",
    report_card_categories=[{"name": "Technical", "metrics": [{"name": "Passing", "score": 70}]}],
    overall_average=70.0,
  )
  session.add(submission)
  session.commit()
  session.refresh(submission)
  return submission


def test_staff_can_create_report_card(session: Session, client: TestClient):
  team = _create_team(session)
  athlete = _create_athlete(session, team_id=team.id)
  token = _auth_token_for_user(session, client, "staff@example.com", UserRole.STAFF)

  payload = {
    "athlete_id": athlete.id,
    "team_id": team.id,
    "coach_report": "Solid performance",
    "categories": [
      {
        "name": "Technical Foundation",
        "metrics": [
          {"name": "Passing", "score": 80},
          {"name": "Dribbling", "score": 70},
        ],
      }
    ],
  }

  response = client.post(
    "/api/v1/report-submissions/report-card",
    json=payload,
    headers={"Authorization": f"Bearer {token}"},
  )

  assert response.status_code == 201
  data = response.json()
  assert data["athlete_name"] == "John Doe"
  assert data["team_name"] == team.name
  assert data["overall_average"] is not None
  assert data["status"] == "pending"


def test_coach_cannot_create_for_unlinked_team(session: Session, client: TestClient):
  team = _create_team(session, name="Team X")
  athlete = _create_athlete(session, team_id=team.id)
  token = _auth_token_for_user(session, client, "coach@example.com", UserRole.COACH)

  payload = {
    "athlete_id": athlete.id,
    "team_id": team.id,
    "coach_report": "Unauthorized attempt",
    "categories": [
      {"name": "Technical Foundation", "metrics": [{"name": "Passing", "score": 75}]}
    ],
  }

  response = client.post(
    "/api/v1/report-submissions/report-card",
    json=payload,
    headers={"Authorization": f"Bearer {token}"},
  )

  assert response.status_code == 403


def test_coach_can_create_for_linked_team(session: Session, client: TestClient):
  team = _create_team(session, name="Team Linked")
  athlete = _create_athlete(session, team_id=team.id)
  coach = User(
    email="linkedcoach@example.com",
    hashed_password=get_password_hash("secret123"),
    full_name="Coach Linked",
    role=UserRole.COACH,
    is_active=True,
  )
  session.add(coach)
  session.commit()
  session.add(CoachTeamLink(user_id=coach.id, team_id=team.id))
  session.commit()
  token = get_auth_token(client, coach.email, "secret123")

  payload = {
    "athlete_id": athlete.id,
    "team_id": team.id,
    "coach_report": "Authorized",
    "categories": [
      {"name": "Technical Foundation", "metrics": [{"name": "Passing", "score": 65}]}
    ],
  }

  response = client.post(
    "/api/v1/report-submissions/report-card",
    json=payload,
    headers={"Authorization": f"Bearer {token}"},
  )

  assert response.status_code == 201
  data = response.json()
  assert data["team_name"] == team.name
  assert data["status"] == "pending"


def test_pending_submissions_pagination_limits_results(session: Session, client: TestClient):
  team = _create_team(session, name="Team Paged")
  athlete = _create_athlete(session, team_id=team.id)
  admin_token = _auth_token_for_user(session, client, "adminpage@example.com", UserRole.ADMIN)
  submitter_id = session.exec(select(User.id).where(User.email == "adminpage@example.com")).first()

  # Create three pending submissions
  for _ in range(3):
    _create_submission(
      session,
      status=ReportSubmissionStatus.PENDING,
      team_id=team.id,
      athlete_id=athlete.id,
      submitted_by_id=submitter_id,
    )

  response = client.get(
    "/api/v1/report-submissions/pending?page=1&size=2",
    headers={"Authorization": f"Bearer {admin_token}"},
  )
  assert response.status_code == 200
  data = response.json()
  assert isinstance(data, list)
  assert len(data) == 2


def test_coach_cannot_view_unlinked_athlete_reports(session: Session, client: TestClient):
  team = _create_team(session, name="Team Visible")
  athlete = _create_athlete(session, team_id=team.id)
  coach_token = _auth_token_for_user(session, client, "isolatedcoach@example.com", UserRole.COACH)
  staff_token = _auth_token_for_user(session, client, "staffviewer@example.com", UserRole.STAFF)
  submitter_id = session.exec(select(User.id).where(User.email == "staffviewer@example.com")).first()

  _create_submission(
    session,
    status=ReportSubmissionStatus.APPROVED,
    team_id=team.id,
    athlete_id=athlete.id,
    submitted_by_id=submitter_id,
  )

  # Coach without team link should be forbidden
  response_coach = client.get(
    f"/api/v1/report-submissions/athlete/{athlete.id}",
    headers={"Authorization": f"Bearer {coach_token}"},
  )
  assert response_coach.status_code == 403

  # Link coach to team and retry
  coach = session.exec(select(User).where(User.email == "isolatedcoach@example.com")).first()
  session.add(CoachTeamLink(user_id=coach.id, team_id=team.id))
  session.commit()
  coach_token = get_auth_token(client, coach.email, "secret123")

  response_coach_linked = client.get(
    f"/api/v1/report-submissions/athlete/{athlete.id}",
    headers={"Authorization": f"Bearer {coach_token}"},
  )
  assert response_coach_linked.status_code == 200
  assert len(response_coach_linked.json()) == 1
