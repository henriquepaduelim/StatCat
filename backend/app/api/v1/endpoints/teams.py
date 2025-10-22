from __future__ import annotations

from typing import Iterable

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlmodel import Session

from app.api.deps import get_current_active_user
from app.db.session import get_session
from app.models.athlete import Athlete
from app.models.team import Team
from app.models.user import User
from app.schemas.team import TeamCreate, TeamRead

router = APIRouter()


def _resolve_client_id(current_user: User, requested_client_id: int | None) -> int:
    if current_user.role == "club":
        if current_user.client_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not assigned to a client",
            )
        return current_user.client_id
    if requested_client_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="client_id must be provided",
        )
    return requested_client_id


def _load_roster_counts(session: Session, team_ids: Iterable[int]) -> dict[int, int]:
    if not team_ids:
        return {}
    statement = (
        select(Athlete.team_id, func.count(Athlete.id))
        .where(Athlete.team_id.in_(tuple(team_ids)))
        .group_by(Athlete.team_id)
    )
    return {team_id: total for team_id, total in session.exec(statement)}


@router.get("/", response_model=list[TeamRead])
def list_teams(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
    client_id: int | None = None,
    age_category: str | None = None,
) -> list[TeamRead]:
    resolved_client_id = _resolve_client_id(current_user, client_id)

    statement = select(Team).where(Team.client_id == resolved_client_id).order_by(Team.name)
    if age_category:
        statement = statement.where(Team.age_category == age_category)

    teams = session.exec(statement).all()
    roster_counts = _load_roster_counts(session, [team.id for team in teams])

    return [
        TeamRead(
            id=team.id,
            client_id=team.client_id,
            name=team.name,
            age_category=team.age_category,
            description=team.description,
            coach_name=team.coach_name,
            created_by_id=team.created_by_id,
            created_at=team.created_at,
            updated_at=team.updated_at,
            athlete_count=roster_counts.get(team.id, 0),
        )
        for team in teams
    ]


@router.post("/", response_model=TeamRead, status_code=status.HTTP_201_CREATED)
def create_team(
    payload: TeamCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> TeamRead:
    resolved_client_id = _resolve_client_id(current_user, payload.client_id)

    team = Team(
        client_id=resolved_client_id,
        name=payload.name,
        age_category=payload.age_category,
        description=payload.description,
        created_by_id=current_user.id,
    )
    session.add(team)
    session.commit()
    session.refresh(team)

    return TeamRead(
        id=team.id,
        client_id=team.client_id,
        name=team.name,
        age_category=team.age_category,
        description=team.description,
        coach_name=team.coach_name,
        created_by_id=team.created_by_id,
        created_at=team.created_at,
        updated_at=team.updated_at,
        athlete_count=0,
    )
