from __future__ import annotations

from typing import Iterable

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, delete, select, func

from app.api.deps import ensure_roles, get_current_active_user
from app.db.session import get_session
from app.models.athlete import Athlete
from app.models.group import Group, GroupMembership
from app.models.user import User, UserRole
from app.schemas.pagination import PaginatedResponse
from app.schemas.group import GroupCreate, GroupRead, GroupUpdate

router = APIRouter()
MANAGE_GROUP_ROLES = {UserRole.ADMIN, UserRole.STAFF}


def _load_memberships(
    session: Session,
    group_ids: Iterable[int],
) -> dict[int, list[int]]:
    mapping: dict[int, list[int]] = {}
    if not group_ids:
        return mapping
    statement = select(GroupMembership).where(GroupMembership.group_id.in_(tuple(group_ids)))
    for membership in session.exec(statement):
        mapping.setdefault(membership.group_id, []).append(membership.athlete_id)
    return mapping


def _validate_athletes(session: Session, athlete_ids: list[int]) -> list[Athlete]:
    if not athlete_ids:
        return []
    statement = select(Athlete).where(Athlete.id.in_(tuple(athlete_ids)))
    athletes = session.exec(statement).all()
    found_ids = {athlete.id for athlete in athletes}
    missing = sorted(set(athlete_ids) - found_ids)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"missingAthletes": missing},
        )
    return athletes


@router.get("/", response_model=PaginatedResponse[GroupRead])
def list_groups(
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_active_user),
    page: int = 1,
    size: int = 50,
) -> PaginatedResponse[GroupRead]:
    """List groups with optional pagination.
    
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
        
    total = session.exec(select(func.count()).select_from(Group)).one()

    statement = select(Group).order_by(Group.name).offset((page - 1) * size).limit(size)
    groups = session.exec(statement).all()
    memberships = _load_memberships(session, [group.id for group in groups])

    items = [
        GroupRead(
            id=group.id,
            name=group.name,
            description=group.description,
            created_by_id=group.created_by_id,
            created_at=group.created_at,
            updated_at=group.updated_at,
            member_ids=memberships.get(group.id, []),
        )
        for group in groups
    ]

    return PaginatedResponse(total=total, page=page, size=size, items=items)


@router.post("/", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
def create_group(
    payload: GroupCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> GroupRead:
    ensure_roles(current_user, MANAGE_GROUP_ROLES)
    _validate_athletes(session, payload.member_ids)

    group = Group(
        name=payload.name,
        description=payload.description,
        created_by_id=current_user.id,
    )
    session.add(group)
    session.commit()
    session.refresh(group)

    if payload.member_ids:
        members = [
            GroupMembership(
                group_id=group.id,
                athlete_id=athlete_id,
                added_by_id=current_user.id,
            )
            for athlete_id in payload.member_ids
        ]
        session.add_all(members)
        session.commit()

    member_mapping = _load_memberships(session, [group.id])

    return GroupRead(
        id=group.id,
        name=group.name,
        description=group.description,
        created_by_id=group.created_by_id,
        created_at=group.created_at,
        updated_at=group.updated_at,
        member_ids=member_mapping.get(group.id, []),
    )


@router.patch("/{group_id}", response_model=GroupRead)
def update_group(
    group_id: int,
    payload: GroupUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> GroupRead:
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    ensure_roles(current_user, MANAGE_GROUP_ROLES)

    if payload.name is not None:
        group.name = payload.name
    if payload.description is not None:
        group.description = payload.description

    if payload.member_ids is not None:
        _validate_athletes(session, payload.member_ids)
        session.exec(delete(GroupMembership).where(GroupMembership.group_id == group.id))
        if payload.member_ids:
            session.add_all(
                [
                    GroupMembership(
                        group_id=group.id,
                        athlete_id=athlete_id,
                        added_by_id=current_user.id,
                    )
                    for athlete_id in payload.member_ids
                ]
            )

    session.add(group)
    session.commit()
    session.refresh(group)

    member_mapping = _load_memberships(session, [group.id])

    return GroupRead(
        id=group.id,
        name=group.name,
        description=group.description,
        created_by_id=group.created_by_id,
        created_at=group.created_at,
        updated_at=group.updated_at,
        member_ids=member_mapping.get(group.id, []),
    )


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> None:
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    ensure_roles(current_user, MANAGE_GROUP_ROLES)

    session.exec(delete(GroupMembership).where(GroupMembership.group_id == group.id))
    session.delete(group)
    session.commit()
