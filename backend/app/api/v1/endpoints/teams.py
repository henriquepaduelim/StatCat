from __future__ import annotations

from typing import Iterable, Sequence

import anyio

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.exc import OperationalError
from sqlmodel import Session

from app.api.deps import ensure_roles, get_current_active_user
from app.core.security import get_password_hash
from app.db.session import get_session
from app.models.athlete import Athlete
from app.models.event import Event
from app.models.event_team_link import EventTeamLink
from sqlalchemy import text

from app.models.team import CoachTeamLink, Team
from app.models.team_post import TeamPost
from app.models.user import User, UserRole
from app.services.email_service import email_service
from app.schemas.team import TeamCoachCreate, TeamCreate, TeamRead
from app.schemas.user import UserRead

router = APIRouter()


def _extract_team_ids(rows: Sequence[object]) -> list[int]:
    team_ids: list[int] = []
    for row in rows:
        if row is None:
            continue
        value = None
        if isinstance(row, (tuple, list)):
            value = row[0]
        else:
            value = getattr(row, "team_id", row)
        if value is not None:
            team_ids.append(int(value))
    return team_ids


def _load_roster_counts(session: Session, team_ids: Iterable[int]) -> dict[int, int]:
    if not team_ids:
        return {}
    statement = (
        select(Athlete.team_id, func.count(Athlete.id))
        .where(Athlete.team_id.in_(tuple(team_ids)))
        .group_by(Athlete.team_id)
    )
    return {team_id: total for team_id, total in session.exec(statement)}


def _get_team_or_404(session: Session, team_id: int) -> Team:
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return team


@router.get("/", response_model=list[TeamRead])
def list_teams(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
    age_category: str | None = None,
    page: int = 1,
    size: int = 50,
) -> list[TeamRead]:
    """List teams with optional pagination.
    
    Args:
        page: Page number (1-indexed), default 1
        size: Items per page, default 50, max 100
    """
    # Validate pagination params
    if page < 1:
        page = 1
    if size < 1:
        size = 50
    if size > 100:
        size = 100
        
    statement = select(Team).order_by(Team.name)
    if age_category:
        statement = statement.where(Team.age_category == age_category)
    
    # Apply pagination
    offset = (page - 1) * size
    statement = statement.offset(offset).limit(size)

    teams = session.exec(statement).scalars().all()
    roster_counts = _load_roster_counts(session, [team.id for team in teams])

    return [
        TeamRead(
            id=team.id,
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


@router.get("/coaches", response_model=list[UserRead])
def list_coaches(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> list[UserRead]:
    """List all coaches with their assigned teams."""
    ensure_roles(current_user, {UserRole.ADMIN, UserRole.STAFF, UserRole.COACH})
    coaches = session.exec(
        select(User)
        .where(User.role == UserRole.COACH)
        .order_by(User.full_name)
    ).scalars().all()
    return coaches


@router.get("/{team_id}", response_model=TeamRead)
def get_team(
    team_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> TeamRead:
    """Retrieve a single team."""
    ensure_roles(current_user, {UserRole.ADMIN, UserRole.STAFF, UserRole.COACH})
    team = _get_team_or_404(session, team_id)
    roster_counts = _load_roster_counts(session, [team.id])
    return TeamRead(
        id=team.id,
        name=team.name,
        age_category=team.age_category,
        description=team.description,
        coach_name=team.coach_name,
        created_by_id=team.created_by_id,
        created_at=team.created_at,
        updated_at=team.updated_at,
        athlete_count=roster_counts.get(team.id, 0),
    )


@router.post("/", response_model=TeamRead, status_code=status.HTTP_201_CREATED)
def create_team(
    payload: TeamCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> TeamRead:
    ensure_roles(current_user, {UserRole.ADMIN, UserRole.STAFF})

    team = Team(
        name=payload.name,
        age_category=payload.age_category,
        description=payload.description,
        coach_name=payload.coach_name,
        created_by_id=current_user.id,
    )
    session.add(team)
    session.commit()
    session.refresh(team)

    # Notify coach if email provided in payload
    if payload.coach_name:
        coach_user = session.exec(select(User).where(User.full_name == payload.coach_name, User.role == UserRole.COACH)).first()
        if coach_user and coach_user.email:
            anyio.from_thread.run(email_service.send_team_assignment, coach_user.email, coach_user.full_name, team.name)

    return TeamRead(
        id=team.id,
        name=team.name,
        age_category=team.age_category,
        description=team.description,
        coach_name=team.coach_name,
        created_by_id=team.created_by_id,
        created_at=team.created_at,
        updated_at=team.updated_at,
        athlete_count=0,
    )


@router.put("/{team_id}", response_model=TeamRead)
def update_team(
    team_id: int,
    payload: TeamCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> TeamRead:
    ensure_roles(current_user, {UserRole.ADMIN, UserRole.STAFF})
    team = _get_team_or_404(session, team_id)

    team.name = payload.name
    team.age_category = payload.age_category
    team.description = payload.description
    if payload.coach_name is not None:
        team.coach_name = payload.coach_name

    session.add(team)
    session.commit()
    session.refresh(team)

    # Get athlete count
    roster_counts = _load_roster_counts(session, [team.id])

    return TeamRead(
        id=team.id,
        name=team.name,
        age_category=team.age_category,
        description=team.description,
        coach_name=team.coach_name,
        created_by_id=team.created_by_id,
        created_at=team.created_at,
        updated_at=team.updated_at,
        athlete_count=roster_counts.get(team.id, 0),
    )


@router.get("/coaches", response_model=list[UserRead])
def list_all_coaches(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> list[UserRead]:
    # Allow admin, staff, and coaches to see the list of coaches
    ensure_roles(current_user, {UserRole.ADMIN, UserRole.STAFF, UserRole.COACH})
    statement = select(User).where(User.role == UserRole.COACH).order_by(User.full_name)
    return session.exec(statement).scalars().all()


@router.get("/{team_id}/coaches", response_model=list[UserRead])
def list_team_coaches(
    team_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> list[UserRead]:
    ensure_roles(current_user, {UserRole.ADMIN, UserRole.STAFF})
    _get_team_or_404(session, team_id)
    statement = (
        select(User)
        .join(CoachTeamLink, CoachTeamLink.user_id == User.id)
        .where(CoachTeamLink.team_id == team_id)
        .order_by(User.full_name)
    )
    return session.exec(statement).scalars().all()


def _create_coach_user(session: Session, payload: TeamCoachCreate) -> User:
    existing = session.exec(select(User).where(User.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        phone=payload.phone,
        hashed_password=get_password_hash(payload.password),
        role=UserRole.COACH,
        is_active=True,
        must_change_password=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    # Send temporary password to coach
    if user.email:
        anyio.from_thread.run(email_service.send_temp_password, user.email, user.full_name, payload.password)

    return user


@router.post("/{team_id}/coaches", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_team_coach(
    team_id: int,
    payload: TeamCoachCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> UserRead:
    ensure_roles(current_user, {UserRole.ADMIN, UserRole.STAFF})
    team = _get_team_or_404(session, team_id)
    user = _create_coach_user(session, payload)

    link = CoachTeamLink(user_id=user.id, team_id=team.id)
    session.add(link)
    if not team.coach_name:
        team.coach_name = user.full_name
        session.add(team)
    session.commit()
    # Notify coach of team assignment if email is present
    if user.email:
        import anyio

        anyio.from_thread.run(email_service.send_team_assignment, user.email, user.full_name, team.name)
    return user


@router.post("/coaches", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_coach(
    payload: TeamCoachCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> UserRead:
    ensure_roles(current_user, {UserRole.ADMIN, UserRole.STAFF})
    return _create_coach_user(session, payload)


@router.post(
    "/{team_id}/coaches/{coach_id}/assign",
    response_model=UserRead,
    status_code=status.HTTP_200_OK,
)
def assign_existing_coach(
    team_id: int,
    coach_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> UserRead:
    ensure_roles(current_user, {UserRole.ADMIN, UserRole.STAFF})
    team = _get_team_or_404(session, team_id)
    coach = session.get(User, coach_id)
    if not coach or coach.role != UserRole.COACH:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coach not found")

    existing_link_row = session.exec(
        select(CoachTeamLink).where(
            CoachTeamLink.team_id == team_id,
            CoachTeamLink.user_id == coach_id,
        )
    ).first()
    if existing_link_row:
        return coach

    link = CoachTeamLink(user_id=coach.id, team_id=team.id)
    session.add(link)
    if not team.coach_name:
        team.coach_name = coach.full_name
        session.add(team)
    session.commit()
    if coach.email:
        anyio.from_thread.run(email_service.send_team_assignment, coach.email, coach.full_name, team.name)
    return coach


@router.get("/coaches", response_model=list[UserRead])
def list_coaches(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> list[UserRead]:
    """List all coaches with their assigned teams."""
    ensure_roles(current_user, {UserRole.ADMIN, UserRole.STAFF, UserRole.COACH})
    coaches = session.exec(
        select(User)
        .where(User.role == UserRole.COACH)
        .order_by(User.full_name)
    ).all()
    return coaches


@router.put("/coaches/{coach_id}", response_model=UserRead)
def update_coach(
    coach_id: int,
    payload: TeamCoachCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> UserRead:
    """Update coach information including password."""
    ensure_roles(current_user, {UserRole.ADMIN, UserRole.STAFF})
    
    coach = session.get(User, coach_id)
    if not coach or coach.role != UserRole.COACH:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coach not found")
    
    # Update fields
    coach.full_name = payload.full_name
    coach.email = payload.email
    if payload.phone:
        coach.phone = payload.phone
    
    # Update password if provided
    if payload.password:
        coach.hashed_password = get_password_hash(payload.password)
    
    session.add(coach)
    session.commit()
    session.refresh(coach)
    return coach


@router.delete("/coaches/{coach_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_coach(
    coach_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """Remove a coach user entirely and detach from any teams."""
    ensure_roles(current_user, {UserRole.ADMIN, UserRole.STAFF})

    coach = session.get(User, coach_id)
    if not coach or coach.role != UserRole.COACH:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coach not found")

    linked_team_ids = _extract_team_ids(
        session.exec(select(CoachTeamLink.team_id).where(CoachTeamLink.user_id == coach_id)).all()
    )

    session.exec(
        text("DELETE FROM coachteamlink WHERE user_id = :user_id").bindparams(user_id=coach_id)
    )

    try:
        events_as_coach = session.exec(select(Event).where(Event.coach_id == coach_id)).all()
        for event in events_as_coach:
            event.coach_id = None
            session.add(event)

        events_created = session.exec(select(Event).where(Event.created_by_id == coach_id)).all()
        for event in events_created:
            event.created_by_id = current_user.id
            session.add(event)
    except OperationalError:
        # Event tables may not exist in legacy deployments; skip cleanup if so.
        pass

    # Clear coach_name if no other coaches remain for affected teams
    for team_id in linked_team_ids:
        remaining = session.exec(
            select(CoachTeamLink).where(CoachTeamLink.team_id == team_id)
        ).first()
        if remaining is None:
            team = session.get(Team, team_id)
            if team:
                team.coach_name = None
                session.add(team)

    session.delete(coach)
    session.commit()


@router.get("/coaches/{coach_id}/teams", response_model=list[TeamRead])
def get_coach_teams(
    coach_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> list[TeamRead]:
    """Get all teams assigned to a specific coach."""
    if current_user.role not in {UserRole.ADMIN, UserRole.STAFF}:
        if current_user.role == UserRole.COACH and current_user.id == coach_id:
            # Coaches can see teams they are assigned to
            pass
        else:
            ensure_roles(current_user, {UserRole.ADMIN, UserRole.STAFF})

    coach = session.get(User, coach_id)
    if not coach or coach.role != UserRole.COACH:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coach not found")
    
    # Get all team IDs for this coach
    team_ids = _extract_team_ids(
        session.exec(select(CoachTeamLink.team_id).where(CoachTeamLink.user_id == coach_id)).all()
    )
    if not team_ids:
        return []
    teams = session.exec(
        select(Team).where(Team.id.in_(tuple(team_ids))).order_by(Team.name)
    ).scalars().all()
    
    roster_counts = _load_roster_counts(session, team_ids)
    
    return [
        TeamRead(
            id=team.id,
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


@router.delete(
    "/{team_id}/coaches/{coach_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_team_coach(
    team_id: int,
    coach_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> None:
    ensure_roles(current_user, {UserRole.ADMIN, UserRole.STAFF})
    team = _get_team_or_404(session, team_id)
    link_row = session.exec(
        select(CoachTeamLink).where(
            CoachTeamLink.team_id == team_id,
            CoachTeamLink.user_id == coach_id,
        )
    ).first()
    if not link_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coach assignment not found")
    link = link_row[0] if isinstance(link_row, tuple) else link_row
    session.delete(link)
    session.commit()

    remaining = session.exec(
        select(CoachTeamLink.user_id).where(CoachTeamLink.team_id == team_id)
    ).first()
    if remaining is None:
        team.coach_name = None
        session.add(team)
        session.commit()


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(
    team_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """Delete a team and detach associated athletes/coaches."""
    ensure_roles(current_user, {UserRole.ADMIN, UserRole.STAFF})
    team = _get_team_or_404(session, team_id)

    # Unassign athletes from the team
    athletes = session.exec(select(Athlete).where(Athlete.team_id == team_id)).scalars().all()
    for athlete in athletes:
        athlete.team_id = None
        session.add(athlete)

    # Remove any coach links and event associations for this team
    session.exec(delete(CoachTeamLink).where(CoachTeamLink.team_id == team_id))
    session.exec(delete(EventTeamLink).where(EventTeamLink.team_id == team_id))

    # Delete team feed posts to satisfy FK constraints
    session.exec(delete(TeamPost).where(TeamPost.team_id == team_id))

    # Detach events referencing this team so FK constraints don't fail
    events = session.exec(select(Event).where(Event.team_id == team_id)).scalars().all()
    for event in events:
        event.team_id = None
        session.add(event)

    session.delete(team)
    session.commit()
