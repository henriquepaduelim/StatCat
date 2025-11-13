from __future__ import annotations

from typing import Iterable

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import get_current_active_user
from app.db.session import get_session
from app.models.athlete import Athlete
from app.models.match_stat import MatchStat
from app.models.team import Team
from app.models.user import User, UserRole
from app.models.report_submission import (
    ReportSubmission,
    ReportSubmissionStatus,
    ReportSubmissionType,
)
from app.schemas.match_reports import GameReportCreate, GameReportResponse

router = APIRouter()

AUTHORIZED_ROLES = {UserRole.ADMIN, UserRole.STAFF, UserRole.COACH}


def _ensure_team(session: Session, team_id: int | None) -> None:
    if team_id is None:
        return
    team = session.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")


def _ensure_athletes_exist(session: Session, athlete_ids: Iterable[int]) -> None:
    identifiers = {athlete_id for athlete_id in athlete_ids if athlete_id is not None}
    if not identifiers:
        return
    rows = session.exec(select(Athlete.id).where(Athlete.id.in_(identifiers))).all()
    existing = {row[0] if isinstance(row, tuple) else row for row in rows}
    missing = identifiers - existing
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Athlete(s) not found: {sorted(missing)}",
        )


@router.post("/reports", response_model=GameReportResponse, status_code=status.HTTP_201_CREATED)
def create_match_report(
    report: GameReportCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> GameReportResponse:
    if current_user.role not in AUTHORIZED_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    if not report.goal_scorers and not report.goalkeepers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one goal scorer or goalkeeper.",
        )

    total_recorded_goals = sum(entry.goals for entry in report.goal_scorers)
    total_recorded_conceded = sum(entry.conceded for entry in report.goalkeepers)

    if report.goals_for and total_recorded_goals and total_recorded_goals != report.goals_for:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sum of goal scorers must match goals_for.",
        )

    if report.goals_against and total_recorded_conceded and total_recorded_conceded != report.goals_against:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sum of goalkeeper conceded values must match goals_against.",
        )

    _ensure_team(session, report.team_id)
    _ensure_athletes_exist(
        session,
        (
            {entry.athlete_id for entry in report.goal_scorers}
            | {entry.athlete_id for entry in report.goalkeepers}
        ),
    )

    submission = ReportSubmission(
        report_type=ReportSubmissionType.GAME,
        status=ReportSubmissionStatus.PENDING,
        submitted_by_id=current_user.id,
        team_id=report.team_id,
        opponent=report.opponent,
        match_date=report.date,
        goals_for=report.goals_for,
        goals_against=report.goals_against,
        notes=report.notes,
    )
    session.add(submission)
    session.commit()
    session.refresh(submission)

    created_entries = 0

    for entry in report.goal_scorers:
        stat = MatchStat(
            athlete_id=entry.athlete_id,
            team_id=report.team_id,
            report_submission_id=submission.id,
            match_date=report.date,
            competition=report.notes,
            opponent=report.opponent,
            venue=report.location,
            goals=entry.goals,
            shootout_goals=entry.shootout_goals,
            goals_conceded=0,
        )
        session.add(stat)
        created_entries += 1

    for entry in report.goalkeepers:
        stat = MatchStat(
            athlete_id=entry.athlete_id,
            team_id=report.team_id,
            report_submission_id=submission.id,
            match_date=report.date,
            competition=report.notes,
            opponent=report.opponent,
            venue=report.location,
            goals=0,
            shootout_goals=0,
            goals_conceded=entry.conceded,
        )
        session.add(stat)
        created_entries += 1

    session.commit()
    return GameReportResponse(created_entries=created_entries)
