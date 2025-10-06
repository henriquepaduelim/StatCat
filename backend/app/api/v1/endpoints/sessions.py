from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.assessment_session import AssessmentSession
from app.models.session_result import SessionResult
from app.models.test_definition import TestDefinition
from app.models.athlete import Athlete
from app.schemas.assessment_session import (
    AssessmentSessionCreate,
    AssessmentSessionRead,
)
from app.schemas.session_result import SessionResultCreate, SessionResultRead

router = APIRouter()


def ensure_related_entities(
    session: Session, results: Sequence[SessionResultCreate]
) -> None:
    athlete_ids = {result.athlete_id for result in results}
    test_ids = {result.test_id for result in results}
    if athlete_ids:
        found_athletes = session.exec(
            select(Athlete.id).where(Athlete.id.in_(athlete_ids))
        ).all()
        missing_athletes = athlete_ids.difference(found_athletes)
        if missing_athletes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Athletes not found: {sorted(missing_athletes)}",
            )
    if test_ids:
        found_tests = session.exec(
            select(TestDefinition.id).where(TestDefinition.id.in_(test_ids))
        ).all()
        missing_tests = test_ids.difference(found_tests)
        if missing_tests:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tests not found: {sorted(missing_tests)}",
            )


@router.get("/", response_model=list[AssessmentSessionRead])
def list_sessions(
    client_id: int | None = None, session: Session = Depends(get_session)
) -> list[AssessmentSessionRead]:
    statement = select(AssessmentSession)
    if client_id is not None:
        statement = statement.where(AssessmentSession.client_id == client_id)
    return session.exec(statement).all()


@router.post(
    "/",
    response_model=AssessmentSessionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_session(
    payload: AssessmentSessionCreate, session: Session = Depends(get_session)
) -> AssessmentSessionRead:
    assessment_session = AssessmentSession.model_validate(payload)
    session.add(assessment_session)
    session.commit()
    session.refresh(assessment_session)
    return assessment_session


@router.get("/{session_id}", response_model=AssessmentSessionRead)
def get_session_detail(
    session_id: int, session: Session = Depends(get_session)
) -> AssessmentSessionRead:
    assessment_session = session.get(AssessmentSession, session_id)
    if not assessment_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return assessment_session


@router.post("/{session_id}/results", response_model=list[SessionResultRead])
def add_results(
    session_id: int,
    payload: list[SessionResultCreate],
    session: Session = Depends(get_session),
) -> list[SessionResultRead]:
    assessment_session = session.get(AssessmentSession, session_id)
    if not assessment_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if not payload:
        return []

    for result in payload:
        result.session_id = session_id

    ensure_related_entities(session, payload)

    created: list[SessionResult] = []
    for result in payload:
        entity = SessionResult.model_validate(result)
        session.add(entity)
        created.append(entity)

    session.commit()
    for entity in created:
        session.refresh(entity)

    return created
