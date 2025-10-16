from collections import defaultdict
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import get_current_active_user
from app.db.session import get_session
from app.models.assessment_session import AssessmentSession
from app.models.athlete import Athlete
from app.models.session_result import SessionResult
from app.models.test_definition import TestDefinition
from app.models.user import User
from app.schemas.athlete import AthleteRead
from app.schemas.report import AthleteReport, MetricResult, SessionReport

router = APIRouter()


def _calculate_age(birth_date: date | None, reference: date | None) -> int | None:
    if birth_date is None:
        return None
    ref = reference or date.today()
    age = ref.year - birth_date.year
    if (ref.month, ref.day) < (birth_date.month, birth_date.day):
        age -= 1
    return age


def _age_band(age: int | None) -> int | None:
    if age is None:
        return None
    return (age // 2) * 2


def _compute_peer_averages(
    db: Session,
    client_id: int | None,
    test_ids: set[int],
    target_band: int | None,
) -> dict[int, float]:
    if not test_ids or target_band is None or client_id is None:
        return {}

    statement = (
        select(
            SessionResult.test_id,
            SessionResult.value,
            Athlete.birth_date,
            AssessmentSession.scheduled_at,
        )
        .join(AssessmentSession, AssessmentSession.id == SessionResult.session_id)
        .join(Athlete, Athlete.id == SessionResult.athlete_id)
        .where(AssessmentSession.client_id == client_id)
        .where(SessionResult.test_id.in_(tuple(test_ids)))
    )

    aggregates: dict[int, list[float]] = {}
    for test_id, value, birth_date, scheduled_at in db.exec(statement).all():
        if value is None:
            continue
        age = _calculate_age(
            birth_date,
            scheduled_at.date() if scheduled_at is not None else None,
        )
        if _age_band(age) != target_band:
            continue
        bucket = aggregates.setdefault(test_id, [])
        bucket.append(float(value))

    return {
        test_id: sum(values) / len(values)
        for test_id, values in aggregates.items()
        if values
    }


@router.get("/athletes/{athlete_id}", response_model=AthleteReport)
def athlete_report(
    athlete_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> AthleteReport:
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")
    if current_user.role == "club" and athlete.client_id != current_user.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    statement = (
        select(SessionResult, AssessmentSession, TestDefinition)
        .join(AssessmentSession, AssessmentSession.id == SessionResult.session_id)
        .join(TestDefinition, TestDefinition.id == SessionResult.test_id)
        .where(SessionResult.athlete_id == athlete_id)
        .order_by(AssessmentSession.scheduled_at, SessionResult.recorded_at)
    )

    rows = session.exec(statement).all()

    test_ids = {test_definition.id for _, _, test_definition in rows}
    target_band = _age_band(_calculate_age(athlete.birth_date, date.today()))
    peer_averages = _compute_peer_averages(session, athlete.client_id, test_ids, target_band)

    grouped: dict[int, dict[str, object]] = defaultdict(
        lambda: {"session": None, "results": []}
    )

    for result, assessment_session, test_definition in rows:
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
            peer_average=peer_averages.get(test_definition.id),
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
