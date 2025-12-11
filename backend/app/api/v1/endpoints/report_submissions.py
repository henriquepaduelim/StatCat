from __future__ import annotations

from datetime import datetime
from typing import List, Tuple

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
    ReportCardCategory,
    ReportCardMetric,
    ReportSubmissionItem,
    ReportSubmissionReview,
)
from app.services.email_service import email_service

router = APIRouter()

CREATION_ROLES = {UserRole.ADMIN, UserRole.STAFF, UserRole.COACH}
APPROVAL_ROLES = {UserRole.ADMIN}
VIEW_APPROVED_ROLES = {UserRole.ADMIN, UserRole.STAFF}


def _clean_text(value: str | None) -> str | None:
    """Trim text and return None if empty."""
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalize_categories(categories: list[ReportCardCategory]) -> list[ReportCardCategory]:
    """Trim names and drop empty metric names."""
    normalized: list[ReportCardCategory] = []
    for category in categories:
        name = (category.name or "").strip()
        if not name:
            continue
        metrics: list[ReportCardMetric] = []
        for metric in category.metrics:
            metric_name = (metric.name or "").strip()
            if not metric_name:
                continue
            metrics.append(ReportCardMetric(name=metric_name, score=metric.score))
        normalized.append(ReportCardCategory(name=name, metrics=metrics))
    return normalized


def _compute_report_card(
    categories: list[ReportCardCategory],
) -> Tuple[list[ReportCardCategory], float | None, int]:
    """Compute per-category and overall averages. Returns (categories, overall_average, filled_scores)."""
    computed_categories: list[ReportCardCategory] = []
    group_avgs: list[float] = []
    total_scores = 0

    for category in categories:
        scores = [metric.score for metric in category.metrics if metric.score is not None]
        total_scores += len(scores)
        group_avg = round(sum(scores) / len(scores), 2) if scores else None
        computed_categories.append(
            ReportCardCategory(
                name=category.name,
                metrics=category.metrics,
                group_average=group_avg,
            )
        )
        if group_avg is not None:
            group_avgs.append(group_avg)

    overall_average = round(sum(group_avgs) / len(group_avgs), 2) if group_avgs else None
    return computed_categories, overall_average, total_scores


def _to_submission_item(
    submission: ReportSubmission,
    team_name: str | None,
    athlete_name: str | None,
    submitter_name: str,
) -> ReportSubmissionItem:
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
        coach_report=submission.coach_report,
        categories=submission.report_card_categories,
        overall_average=submission.overall_average,
        review_notes=submission.review_notes,
        submitted_by=submitter_name,
        created_at=submission.created_at,
    )


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
            _to_submission_item(
                submission=submission,
                team_name=team_name,
                athlete_name=athlete_name,
                submitter_name=submitter_name,
            )
        )
    return items


@router.get("/approved", response_model=List[ReportSubmissionItem])
def list_approved_submissions(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> List[ReportSubmissionItem]:
    if current_user.role not in VIEW_APPROVED_ROLES:
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
        .where(ReportSubmission.status == ReportSubmissionStatus.APPROVED)
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
            _to_submission_item(
                submission=submission,
                team_name=team_name,
                athlete_name=athlete_name,
                submitter_name=submitter_name,
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
            _to_submission_item(
                submission=submission,
                team_name=team_name,
                athlete_name=athlete_name,
                submitter_name=current_user.full_name,
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
            _to_submission_item(
                submission=submission,
                team_name=team_name,
                athlete_name=f"{athlete.first_name} {athlete.last_name}".strip(),
                submitter_name=submitter_name,
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

    coach_report = _clean_text(payload.coach_report)
    if not coach_report:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coach report is required.",
        )

    normalized_categories = _normalize_categories(payload.categories)
    computed_categories, overall_average, total_scores = _compute_report_card(normalized_categories)

    if total_scores == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one score greater than zero.",
        )

    report_payload = [category.model_dump() for category in computed_categories]

    submission = ReportSubmission(
        report_type=ReportSubmissionType.REPORT_CARD,
        status=ReportSubmissionStatus.PENDING,
        submitted_by_id=current_user.id,
        team_id=payload.team_id,
        athlete_id=payload.athlete_id,
        coach_report=coach_report,
        general_notes=coach_report,
        report_card_categories=report_payload,
        overall_average=overall_average,
    )
    session.add(submission)
    session.commit()
    session.refresh(submission)

    athlete_name = f"{athlete.first_name} {athlete.last_name}".strip()
    team_name = None
    if payload.team_id:
        team = session.get(Team, payload.team_id)
        team_name = team.name if team else None

    return _to_submission_item(
        submission=submission,
        team_name=team_name,
        athlete_name=athlete_name,
        submitter_name=current_user.full_name,
    )


@router.put("/{submission_id}", response_model=ReportSubmissionItem)
def update_report_card(
    submission_id: int,
    payload: ReportCardCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> ReportSubmissionItem:
    if current_user.role not in CREATION_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    submission = session.get(ReportSubmission, submission_id)
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    if submission.report_type != ReportSubmissionType.REPORT_CARD:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only report cards can be updated via this endpoint.",
        )

    if submission.status == ReportSubmissionStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Approved submissions must be reopened by an admin before editing.",
        )

    if current_user.role not in {UserRole.ADMIN} and submission.submitted_by_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    athlete = session.get(Athlete, payload.athlete_id)
    if not athlete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")

    coach_report = _clean_text(payload.coach_report)
    if not coach_report:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coach report is required.",
        )

    normalized_categories = _normalize_categories(payload.categories)
    computed_categories, overall_average, total_scores = _compute_report_card(normalized_categories)

    if total_scores == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one score greater than zero.",
        )

    team = session.get(Team, payload.team_id) if payload.team_id else None

    submission.team_id = payload.team_id
    submission.athlete_id = payload.athlete_id
    submission.coach_report = coach_report
    submission.general_notes = coach_report
    submission.report_card_categories = [category.model_dump() for category in computed_categories]
    submission.overall_average = overall_average
    submission.status = ReportSubmissionStatus.PENDING
    submission.review_notes = None
    submission.approved_by_id = None
    submission.approved_at = None

    session.add(submission)
    session.commit()
    session.refresh(submission)

    athlete_name = f"{athlete.first_name} {athlete.last_name}".strip()
    team_name = team.name if team else None

    return _to_submission_item(
        submission=submission,
        team_name=team_name,
        athlete_name=athlete_name,
        submitter_name=current_user.full_name,
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

    team_name = None
    athlete_name = None
    athlete_email = None
    athlete: Athlete | None = None
    if submission.team_id:
        team = session.get(Team, submission.team_id)
        team_name = team.name if team else None
    if submission.athlete_id:
        athlete = session.get(Athlete, submission.athlete_id)
        if athlete:
            athlete_name = f"{athlete.first_name} {athlete.last_name}".strip()
            athlete_email = athlete.email

    submission.status = ReportSubmissionStatus.APPROVED
    submission.approved_by_id = current_user.id
    submission.approved_at = datetime.utcnow()

    session.add(submission)
    session.commit()
    session.refresh(submission)

    submitter = session.get(User, submission.submitted_by_id)
    submitter_name = submitter.full_name if submitter else ""

    # Notify athlete if we have an email (only after approval)
    if athlete_email:
        await email_service.send_report_ready(
            to_email=athlete_email,
            to_name=athlete_name or None,
        )

    return _to_submission_item(
        submission=submission,
        team_name=team_name,
        athlete_name=athlete_name,
        submitter_name=submitter_name,
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

    submitter = session.get(User, submission.submitted_by_id)
    submitter_name = submitter.full_name if submitter else ""

    return _to_submission_item(
        submission=submission,
        team_name=team_name,
        athlete_name=athlete_name,
        submitter_name=submitter_name,
    )


@router.post("/{submission_id}/reopen", response_model=ReportSubmissionItem)
def reopen_submission(
    submission_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> ReportSubmissionItem:
    if current_user.role not in APPROVAL_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    submission = session.get(ReportSubmission, submission_id)
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    if submission.report_type != ReportSubmissionType.REPORT_CARD:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only report cards can be reopened.",
        )

    if submission.status == ReportSubmissionStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submission is already pending review.",
        )

    submission.status = ReportSubmissionStatus.REOPENED
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
    submitter = session.get(User, submission.submitted_by_id)
    submitter_name = submitter.full_name if submitter else ""

    return _to_submission_item(
        submission=submission,
        team_name=team_name,
        athlete_name=athlete_name,
        submitter_name=submitter_name,
    )

@router.delete("/{submission_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_submission(
    submission_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """Delete a report submission. Only available to admins and staff."""
    if current_user.role not in APPROVAL_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    submission = session.get(ReportSubmission, submission_id)
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found"
        )

    session.delete(submission)
    session.commit()
    return None
