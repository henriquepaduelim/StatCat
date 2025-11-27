from __future__ import annotations

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlmodel import Session

from app.api.deps import get_current_active_user
from app.db.session import get_session
from app.models.athlete import Athlete
from app.models.report_submission import (
    ReportSubmission,
    ReportSubmissionStatus,
    ReportSubmissionType,
)
from app.models.team import Team
from app.models.user import User, UserRole
from app.schemas.report_submission import (
    ReportCardCreate,
    ReportSubmissionItem,
    ReportSubmissionReview,
)
from app.services.email_service import email_service

router = APIRouter()

CREATION_ROLES = {UserRole.ADMIN, UserRole.STAFF, UserRole.COACH}
APPROVAL_ROLES = {UserRole.ADMIN, UserRole.STAFF}


@router.get("/pending", response_model=List[ReportSubmissionItem])
def list_pending_submissions(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> List[ReportSubmissionItem]:
    if current_user.role not in APPROVAL_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    statement = (
        select(
            ReportSubmission,
            Team.name,
            Athlete.first_name,
            Athlete.last_name,
            User.full_name,
        )
        .outerjoin(Team, Team.id == ReportSubmission.team_id)
        .outerjoin(Athlete, Athlete.id == ReportSubmission.athlete_id)
        .join(User, User.id == ReportSubmission.submitted_by_id)
        .where(ReportSubmission.status == ReportSubmissionStatus.PENDING)
        .order_by(ReportSubmission.created_at.desc())
    )

    items: list[ReportSubmissionItem] = []
    for submission, team_name, athlete_first, athlete_last, submitter_name in session.exec(statement):
        athlete_name = (
            f"{athlete_first} {athlete_last}".strip()
            if athlete_first or athlete_last
            else None
        )
        items.append(
            ReportSubmissionItem(
                id=submission.id,
                report_type=submission.report_type.value,
                status=submission.status.value,
                team_name=team_name,
                opponent=submission.opponent,
                athlete_name=athlete_name,
                match_date=submission.match_date,
                goals_for=submission.goals_for,
                goals_against=submission.goals_against,
                technical_rating=submission.technical_rating,
                physical_rating=submission.physical_rating,
                training_rating=submission.training_rating,
                match_rating=submission.match_rating,
                general_notes=submission.general_notes,
                review_notes=submission.review_notes,
                submitted_by=submitter_name,
                created_at=submission.created_at,
            )
        )
    return items


@router.get("/mine", response_model=List[ReportSubmissionItem])
def list_my_submissions(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> List[ReportSubmissionItem]:
    statement = (
        select(
            ReportSubmission,
            Team.name,
            Athlete.first_name,
            Athlete.last_name,
        )
        .outerjoin(Team, Team.id == ReportSubmission.team_id)
        .outerjoin(Athlete, Athlete.id == ReportSubmission.athlete_id)
        .where(ReportSubmission.submitted_by_id == current_user.id)
        .order_by(ReportSubmission.created_at.desc())
    )
    items: list[ReportSubmissionItem] = []
    for submission, team_name, athlete_first, athlete_last in session.exec(statement):
        athlete_name = (
            f"{athlete_first} {athlete_last}".strip()
            if athlete_first or athlete_last
            else None
        )
        items.append(
            ReportSubmissionItem(
                id=submission.id,
                report_type=submission.report_type.value,
                status=submission.status.value,
                team_name=team_name,
                opponent=submission.opponent,
                athlete_name=athlete_name,
                match_date=submission.match_date,
                goals_for=submission.goals_for,
                goals_against=submission.goals_against,
                technical_rating=submission.technical_rating,
                physical_rating=submission.physical_rating,
                training_rating=submission.training_rating,
                match_rating=submission.match_rating,
                general_notes=submission.general_notes,
                review_notes=submission.review_notes,
                submitted_by=current_user.full_name,
                created_at=submission.created_at,
            )
        )
    return items


@router.get("/athlete/{athlete_id}", response_model=List[ReportSubmissionItem])
def list_athlete_reports(
    athlete_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> List[ReportSubmissionItem]:
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")

    if current_user.role == UserRole.ATHLETE and current_user.athlete_id != athlete_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    if current_user.role not in {UserRole.ADMIN, UserRole.STAFF, UserRole.COACH, UserRole.ATHLETE}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    statement = (
        select(
            ReportSubmission,
            Team.name,
            User.full_name,
        )
        .outerjoin(Team, Team.id == ReportSubmission.team_id)
        .join(User, User.id == ReportSubmission.submitted_by_id)
        .where(
            ReportSubmission.athlete_id == athlete_id,
            ReportSubmission.report_type == ReportSubmissionType.REPORT_CARD,
            ReportSubmission.status == ReportSubmissionStatus.APPROVED,
        )
        .order_by(ReportSubmission.created_at.desc())
    )

    results: list[ReportSubmissionItem] = []
    for submission, team_name, submitter_name in session.exec(statement):
        results.append(
            ReportSubmissionItem(
                id=submission.id,
                report_type=submission.report_type.value,
                status=submission.status.value,
                team_name=team_name,
                opponent=submission.opponent,
                athlete_name=f"{athlete.first_name} {athlete.last_name}".strip(),
                match_date=submission.match_date,
                goals_for=submission.goals_for,
                goals_against=submission.goals_against,
                technical_rating=submission.technical_rating,
                physical_rating=submission.physical_rating,
                training_rating=submission.training_rating,
                match_rating=submission.match_rating,
                general_notes=submission.general_notes,
                review_notes=submission.review_notes,
                submitted_by=submitter_name,
                created_at=submission.created_at,
            )
        )
    return results


@router.post("/report-card", response_model=ReportSubmissionItem, status_code=status.HTTP_201_CREATED)
def request_report_card(
    payload: ReportCardCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> ReportSubmissionItem:
    if current_user.role not in CREATION_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    athlete = session.get(Athlete, payload.athlete_id)
    if not athlete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")

    submission = ReportSubmission(
        report_type=ReportSubmissionType.REPORT_CARD,
        status=ReportSubmissionStatus.PENDING,
        submitted_by_id=current_user.id,
        team_id=payload.team_id,
        athlete_id=payload.athlete_id,
        notes=payload.general_notes,
        technical_rating=payload.technical_rating,
        physical_rating=payload.physical_rating,
        training_rating=payload.training_rating,
        match_rating=payload.match_rating,
        general_notes=payload.general_notes,
    )
    session.add(submission)
    session.commit()
    session.refresh(submission)

    athlete_name = f"{athlete.first_name} {athlete.last_name}".strip()
    return ReportSubmissionItem(
        id=submission.id,
        report_type=submission.report_type.value,
        status=submission.status.value,
        team_name=None,
        opponent=None,
        athlete_name=athlete_name,
        match_date=None,
        goals_for=None,
        goals_against=None,
        technical_rating=submission.technical_rating,
        physical_rating=submission.physical_rating,
        training_rating=submission.training_rating,
        match_rating=submission.match_rating,
        general_notes=submission.general_notes,
        review_notes=submission.review_notes,
        submitted_by=current_user.full_name,
        created_at=submission.created_at,
    )


@router.post("/{submission_id}/approve", response_model=ReportSubmissionItem)
async def approve_submission(
    submission_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> ReportSubmissionItem:
    if current_user.role not in APPROVAL_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    submission = session.get(ReportSubmission, submission_id)
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if submission.status != ReportSubmissionStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already resolved")

    submission.status = ReportSubmissionStatus.APPROVED
    submission.approved_by_id = current_user.id
    submission.approved_at = datetime.utcnow()
    session.add(submission)
    session.commit()
    session.refresh(submission)

    team_name = None
    athlete_name = None
    athlete_email = None
    if submission.team_id:
        team = session.get(Team, submission.team_id)
        team_name = team.name if team else None
    if submission.athlete_id:
        athlete = session.get(Athlete, submission.athlete_id)
        if athlete:
            athlete_name = f"{athlete.first_name} {athlete.last_name}".strip()
            athlete_email = athlete.email

    # Notify athlete if we have an email (only after approval)
    if athlete_email:
        await email_service.send_report_ready(
            to_email=athlete_email,
            to_name=athlete_name or None,
        )

    return ReportSubmissionItem(
        id=submission.id,
        report_type=submission.report_type.value,
        status=submission.status.value,
        team_name=team_name,
        opponent=submission.opponent,
        athlete_name=athlete_name,
        match_date=submission.match_date,
        goals_for=submission.goals_for,
        goals_against=submission.goals_against,
        technical_rating=submission.technical_rating,
        physical_rating=submission.physical_rating,
        training_rating=submission.training_rating,
        match_rating=submission.match_rating,
        general_notes=submission.general_notes,
        review_notes=submission.review_notes,
        submitted_by=current_user.full_name,
        created_at=submission.created_at,
    )


@router.post("/{submission_id}/reject", response_model=ReportSubmissionItem)
def reject_submission(
    submission_id: int,
    payload: ReportSubmissionReview,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> ReportSubmissionItem:
    if current_user.role not in APPROVAL_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    submission = session.get(ReportSubmission, submission_id)
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if submission.status != ReportSubmissionStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already resolved")

    cleaned_notes = payload.notes.strip()
    if not cleaned_notes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide a note explaining the rejection.",
        )

    submission.status = ReportSubmissionStatus.REJECTED
    submission.review_notes = cleaned_notes
    submission.approved_by_id = current_user.id
    submission.approved_at = datetime.utcnow()
    session.add(submission)
    session.commit()
    session.refresh(submission)

    team_name = None
    athlete_name = None
    if submission.team_id:
        team = session.get(Team, submission.team_id)
        team_name = team.name if team else None
    if submission.athlete_id:
        athlete = session.get(Athlete, submission.athlete_id)
        athlete_name = f"{athlete.first_name} {athlete.last_name}".strip() if athlete else None

    return ReportSubmissionItem(
        id=submission.id,
        report_type=submission.report_type.value,
        status=submission.status.value,
        team_name=team_name,
        opponent=submission.opponent,
        athlete_name=athlete_name,
        match_date=submission.match_date,
        goals_for=submission.goals_for,
        goals_against=submission.goals_against,
        technical_rating=submission.technical_rating,
        physical_rating=submission.physical_rating,
        training_rating=submission.training_rating,
        match_rating=submission.match_rating,
        general_notes=submission.general_notes,
        review_notes=submission.review_notes,
        submitted_by=current_user.full_name,
        created_at=submission.created_at,
    )
