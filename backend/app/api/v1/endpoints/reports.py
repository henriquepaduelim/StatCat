from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.assessment_session import AssessmentSession
from app.models.athlete import Athlete
from app.models.session_result import SessionResult
from app.models.test_definition import TestDefinition
from app.schemas.athlete import AthleteRead
from app.schemas.report import AthleteReport, MetricResult, SessionReport

router = APIRouter()


@router.get("/athletes/{athlete_id}", response_model=AthleteReport)
def athlete_report(
    athlete_id: int, session: Session = Depends(get_session)
) -> AthleteReport:
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")

    statement = (
        select(SessionResult, AssessmentSession, TestDefinition)
        .join(AssessmentSession, AssessmentSession.id == SessionResult.session_id)
        .join(TestDefinition, TestDefinition.id == SessionResult.test_id)
        .where(SessionResult.athlete_id == athlete_id)
        .order_by(AssessmentSession.scheduled_at, SessionResult.recorded_at)
    )

    grouped: dict[int, dict[str, object]] = defaultdict(
        lambda: {"session": None, "results": []}
    )

    for result, assessment_session, test_definition in session.exec(statement).all():
        data = grouped[result.session_id]
        if data["session"] is None:
            data["session"] = assessment_session
        metric = MetricResult(
            test_id=test_definition.id,
            test_name=test_definition.name,
            category=test_definition.category,
            value=result.value,
            unit=result.unit or test_definition.unit,
            recorded_at=result.recorded_at,
            notes=result.notes,
        )
        data["results"].append(metric)

    sessions: list[SessionReport] = []
    for session_id, item in grouped.items():
        assessment_session = item["session"]
        results = item["results"]
        sessions.append(
            SessionReport(
                session_id=session_id,
                session_name=assessment_session.name,
                scheduled_at=assessment_session.scheduled_at,
                location=assessment_session.location,
                results=results,
            )
        )

    athlete_schema = AthleteRead.model_validate(athlete)
    return AthleteReport(athlete=athlete_schema, sessions=sessions)
