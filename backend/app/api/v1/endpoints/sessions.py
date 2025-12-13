from collections.abc import Sequence
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func

from app.api.deps import ensure_roles, get_current_active_user
from app.db.session import get_session
from app.models.assessment_session import AssessmentSession
from app.models.session_result import SessionResult
from app.models.test_definition import TestDefinition
from app.models.athlete import Athlete
from app.models.user import User, UserRole
from app.schemas.pagination import PaginatedResponse
from app.schemas.assessment_session import (
    AssessmentSessionCreate,
    AssessmentSessionRead,
    AssessmentSessionUpdate,
)
from app.schemas.session_result import SessionResultCreate, SessionResultRead

router = APIRouter()
MANAGE_SESSION_ROLES = {UserRole.ADMIN, UserRole.STAFF}
READ_SESSION_ROLES = {UserRole.ADMIN, UserRole.STAFF, UserRole.COACH}


def _ensure_can_view(user: User) -> None:
    ensure_roles(user, READ_SESSION_ROLES)


def _ensure_can_edit(user: User) -> None:
    ensure_roles(user, MANAGE_SESSION_ROLES)


def ensure_related_entities(session: Session, results: Sequence[SessionResultCreate]) -> None:
    athlete_ids = {result.athlete_id for result in results}
    test_ids = {result.test_id for result in results}
    if athlete_ids:
        athlete_query = select(Athlete.id).where(Athlete.id.in_(athlete_ids))
        found_athletes = session.exec(athlete_query).all()
        found_ids = {row[0] for row in found_athletes}
        missing_athletes = athlete_ids.difference(found_ids)
        if missing_athletes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Athletes not found: {sorted(missing_athletes)}",
            )
    if test_ids:
        test_query = select(TestDefinition.id).where(TestDefinition.id.in_(test_ids))
        found_tests = session.exec(test_query).all()
        found_test_ids = {row[0] for row in found_tests}
        missing_tests = test_ids.difference(found_test_ids)
        if missing_tests:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tests not found: {sorted(missing_tests)}",
            )


@router.get("/", response_model=PaginatedResponse[AssessmentSessionRead])
def list_sessions(
    start: date | None = None,
    end: date | None = None,
    page: int = 1,
    size: int = 50,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> PaginatedResponse[AssessmentSessionRead]:
    _ensure_can_view(current_user)
    page = page if page > 0 else 1
    size = size if size > 0 else 50
    size = min(size, 200)

    statement = select(AssessmentSession)
    if start:
        statement = statement.where(AssessmentSession.scheduled_at >= start)
    if end:
        statement = statement.where(AssessmentSession.scheduled_at <= end)

    total = session.exec(select(func.count()).select_from(statement.subquery())).one()

    statement = (
        statement.order_by(AssessmentSession.scheduled_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    items = session.exec(statement).all()
    return PaginatedResponse(total=total, page=page, size=size, items=items)


@router.post(
    "/",
    response_model=AssessmentSessionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_session(
    payload: AssessmentSessionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> AssessmentSessionRead:
    _ensure_can_edit(current_user)
    assessment_session = AssessmentSession.model_validate(payload.model_dump())
    session.add(assessment_session)
    session.commit()
    session.refresh(assessment_session)
    return assessment_session


@router.get("/{session_id}", response_model=AssessmentSessionRead)
def get_session_detail(
    session_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> AssessmentSessionRead:
    assessment_session = session.get(AssessmentSession, session_id)
    if not assessment_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    _ensure_can_view(current_user)
    return assessment_session


@router.put("/{session_id}", response_model=AssessmentSessionRead)
def update_session(
    session_id: int,
    payload: AssessmentSessionUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> AssessmentSessionRead:
    assessment_session = session.get(AssessmentSession, session_id)
    if not assessment_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    _ensure_can_edit(current_user)

    update_data = payload.model_dump(exclude_unset=True)
    assessment_session.sqlmodel_update(update_data)
    session.add(assessment_session)
    session.commit()
    session.refresh(assessment_session)
    return assessment_session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> None:
    assessment_session = session.get(AssessmentSession, session_id)
    if not assessment_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    _ensure_can_edit(current_user)

    session.delete(assessment_session)
    session.commit()


@router.post("/{session_id}/results", response_model=list[SessionResultRead])
def add_results(
    session_id: int,
    payload: list[SessionResultCreate],
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> list[SessionResultRead]:
    assessment_session = session.get(AssessmentSession, session_id)
    if not assessment_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    _ensure_can_edit(current_user)

    if not payload:
        return []

    for result in payload:
        result.session_id = session_id

    ensure_related_entities(session, payload)

    created: list[SessionResult] = []
    for result in payload:
        data = result.model_dump(exclude_none=True)
        entity = SessionResult.model_validate(data)
        session.add(entity)
        created.append(entity)

    session.commit()
    for entity in created:
        session.refresh(entity)

    return created
