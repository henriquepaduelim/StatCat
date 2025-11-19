from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.api.deps import SessionDep, get_current_active_user
from app.models.athlete import Athlete
from app.models.team import CoachTeamLink, Team
from app.models.team_combine_metric import TeamCombineMetric
from app.models.user import User, UserRole
from app.schemas.team_combine_metric import TeamCombineMetricCreate, TeamCombineMetricRead

router = APIRouter()


def _ensure_team_access(session: SessionDep, current_user: User, team_id: int) -> Team:
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    if current_user.role in {UserRole.ADMIN, UserRole.STAFF}:
        return team

    if current_user.role == UserRole.COACH:
        membership = session.exec(
            select(CoachTeamLink).where(
                CoachTeamLink.team_id == team_id,
                CoachTeamLink.user_id == current_user.id,
            )
        ).first()
        if membership:
            return team
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    if current_user.role == UserRole.ATHLETE:
        if current_user.athlete_id is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
        athlete = session.get(Athlete, current_user.athlete_id)
        if athlete and athlete.team_id == team_id:
            return team
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")


@router.post(
    "/teams/{team_id}/combine-metrics",
    response_model=TeamCombineMetricRead,
    status_code=status.HTTP_201_CREATED,
)
def create_team_combine_metric(
    team_id: int,
    payload: TeamCombineMetricCreate,
    session: SessionDep,
    current_user: User = Depends(get_current_active_user),
) -> TeamCombineMetricRead:
    if current_user.role not in {UserRole.ADMIN, UserRole.STAFF, UserRole.COACH}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    _ensure_team_access(session, current_user, team_id)

    recorded_at = payload.recorded_at or datetime.utcnow()

    metric = TeamCombineMetric(
        team_id=team_id,
        athlete_id=payload.athlete_id,
        sitting_height_cm=payload.sitting_height_cm,
        standing_height_cm=payload.standing_height_cm,
        weight_kg=payload.weight_kg,
        split_10m_s=payload.split_10m_s,
        split_20m_s=payload.split_20m_s,
        split_35m_s=payload.split_35m_s,
        yoyo_distance_m=payload.yoyo_distance_m,
        jump_cm=payload.jump_cm,
        max_power_kmh=payload.max_power_kmh,
        recorded_by_id=current_user.id,
        recorded_at=recorded_at,
    )
    session.add(metric)
    session.commit()
    session.refresh(metric)
    return TeamCombineMetricRead.model_validate(metric)


@router.get(
    "/teams/{team_id}/combine-metrics",
    response_model=list[TeamCombineMetricRead],
)
def list_team_combine_metrics(
    team_id: int,
    session: SessionDep,
    current_user: User = Depends(get_current_active_user),
    limit: int = 10,
) -> list[TeamCombineMetricRead]:
    _ensure_team_access(session, current_user, team_id)
    if limit < 1:
        limit = 10
    if limit > 50:
        limit = 50
    statement = (
        select(TeamCombineMetric)
        .where(TeamCombineMetric.team_id == team_id)
        .order_by(TeamCombineMetric.recorded_at.desc())
        .limit(limit)
    )
    metrics = session.exec(statement).scalars().all()
    return [TeamCombineMetricRead.model_validate(metric) for metric in metrics]
