from __future__ import annotations

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.athlete import Athlete, AthleteGender
from app.models.team import CoachTeamLink
from app.models.user import User, UserRole, UserAthleteApprovalStatus
from app.services.email_service import email_service

MANAGE_ATHLETE_ROLES: set[UserRole] = {UserRole.ADMIN, UserRole.STAFF}
READ_ATHLETE_ROLES: set[UserRole] = {
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.COACH,
    UserRole.ATHLETE,
}


def _coach_team_ids(session: Session, coach_id: int) -> set[int]:
    # SQLModel <2 returns ScalarResult; normalize to list[int]
    rows = session.exec(
        select(CoachTeamLink.team_id).where(CoachTeamLink.user_id == coach_id)
    ).all()
    team_ids: set[int] = set()
    for row in rows:
        value = row[0] if isinstance(row, tuple) else row
        if value is not None:
            team_ids.add(int(value))
    return team_ids


def build_athlete_query_for_user(
    session: Session,
    current_user: User,
    gender: AthleteGender | None = None,
    team_id: int | None = None,
):
    """
    Return a SQLModel select for athletes with RBAC filters applied for the current user.

    - Admin/Staff: unrestricted
    - Coach: restricted to linked teams; forbidden to filter to a team they don't own
    - Athlete: only their own record
    """
    if current_user.role not in READ_ATHLETE_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    statement = select(Athlete)

    if current_user.role == UserRole.ATHLETE:
        if current_user.athlete_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed"
            )
        statement = statement.where(Athlete.id == current_user.athlete_id)
    elif current_user.role == UserRole.COACH:
        allowed_team_ids = _coach_team_ids(session, current_user.id)
        if team_id is not None and team_id not in allowed_team_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed"
            )
        if allowed_team_ids:
            statement = statement.where(Athlete.team_id.in_(allowed_team_ids))
        else:
            # No linked teams; return empty result set
            statement = statement.where(Athlete.id == None)  # noqa: E711

    if gender is not None:
        statement = statement.where(Athlete.gender == gender)
    if team_id is not None:
        statement = statement.where(Athlete.team_id == team_id)

    return statement


async def approve_athlete(
    session: Session, athlete_id: int, approving: User
) -> Athlete:
    if approving.role not in MANAGE_ATHLETE_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found"
        )

    user = session.exec(select(User).where(User.athlete_id == athlete.id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found for athlete"
        )

    user.athlete_status = UserAthleteApprovalStatus.APPROVED
    user.rejection_reason = None

    session.add(user)
    session.commit()
    session.refresh(athlete)

    if user.email:
        try:
            await email_service.send_account_approved(
                to_email=user.email,
                to_name=user.full_name or None,
            )
        except Exception:
            # Email is best-effort; log inside service in real env
            pass

    return athlete


def reject_athlete(
    session: Session, athlete_id: int, approving: User, reason: str
) -> Athlete:
    if approving.role not in MANAGE_ATHLETE_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    cleaned_reason = (reason or "").strip()
    if not cleaned_reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Rejection reason required"
        )

    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found"
        )

    user = session.exec(select(User).where(User.athlete_id == athlete.id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found for athlete"
        )

    user.athlete_status = UserAthleteApprovalStatus.REJECTED
    user.rejection_reason = cleaned_reason

    session.add(user)
    session.commit()
    session.refresh(athlete)
    return athlete
