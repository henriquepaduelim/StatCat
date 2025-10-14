from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import get_current_active_user
from app.db.session import get_session
from app.models.assessment_session import AssessmentSession
from app.models.session_result import SessionResult
from app.models.test_definition import TestDefinition
from app.models.athlete import Athlete
from app.models.user import User
from app.schemas.assessment_session import (
    AssessmentSessionCreate,
    AssessmentSessionRead,
)
from app.schemas.session_result import SessionResultCreate, SessionResultRead

router = APIRouter()


def ensure_related_entities(
    session: Session, results: Sequence[SessionResultCreate], client_id: int | None
) -> None:
    athlete_ids = {result.athlete_id for result in results}
    test_ids = {result.test_id for result in results}
    if athlete_ids:
        athlete_query = select(Athlete.id, Athlete.client_id).where(
            Athlete.id.in_(athlete_ids)
        )
        found_athletes = session.exec(athlete_query).all()
        found_ids = {row[0] for row in found_athletes}
        missing_athletes = athlete_ids.difference(found_ids)
        if missing_athletes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Athletes not found: {sorted(missing_athletes)}",
            )
        if client_id is not None and any(db_client != client_id for _, db_client in found_athletes):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more athletes belong to another client",
            )
    if test_ids:
        test_query = select(TestDefinition.id, TestDefinition.client_id).where(
            TestDefinition.id.in_(test_ids)
        )
        found_tests = session.exec(test_query).all()
        found_test_ids = {row[0] for row in found_tests}
        missing_tests = test_ids.difference(found_test_ids)
        if missing_tests:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tests not found: {sorted(missing_tests)}",
            )
        if client_id is not None and any(db_client != client_id for _, db_client in found_tests):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more tests belong to another client",
            )


@router.get("/", response_model=list[AssessmentSessionRead])
def list_sessions(
    client_id: int | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> list[AssessmentSessionRead]:
    statement = select(AssessmentSession)
    if current_user.role == "club":
        statement = statement.where(AssessmentSession.client_id == current_user.client_id)
    elif client_id is not None:
        statement = statement.where(AssessmentSession.client_id == client_id)
    return session.exec(statement).all()


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
    data = payload.model_dump()
    if current_user.role == "club":
        data["client_id"] = current_user.client_id
    assessment_session = AssessmentSession.model_validate(data)
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
    if current_user.role == "club" and assessment_session.client_id != current_user.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    return assessment_session


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
    if current_user.role == "club" and assessment_session.client_id != current_user.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    if not payload:
        return []

    for result in payload:
        result.session_id = session_id

    ensure_related_entities(session, payload, assessment_session.client_id)

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
