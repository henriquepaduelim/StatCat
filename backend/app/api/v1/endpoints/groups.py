from __future__ import annotations

from typing import Iterable

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, delete, select

from app.api.deps import get_current_active_user
from app.db.session import get_session
from app.models.athlete import Athlete
from app.models.group import Group, GroupMembership
from app.models.user import User
from app.schemas.group import GroupCreate, GroupRead, GroupUpdate

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


def _validate_athletes(session: Session, client_id: int, athlete_ids: list[int]) -> list[Athlete]:
    if not athlete_ids:
        return []
    statement = select(Athlete).where(
        Athlete.id.in_(tuple(athlete_ids)),
        Athlete.client_id == client_id,
    )
    athletes = session.exec(statement).all()
    found_ids = {athlete.id for athlete in athletes}
    missing = sorted(set(athlete_ids) - found_ids)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"missingAthletes": missing},
        )
    return athletes


@router.get("/", response_model=list[GroupRead])
def list_groups(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
    client_id: int | None = None,
) -> list[GroupRead]:
    resolved_client_id = _resolve_client_id(current_user, client_id)
    statement = select(Group).where(Group.client_id == resolved_client_id).order_by(Group.name)
    groups = session.exec(statement).all()
    memberships = _load_memberships(session, [group.id for group in groups])

    return [
        GroupRead(
            id=group.id,
            client_id=group.client_id,
            name=group.name,
            description=group.description,
            created_by_id=group.created_by_id,
            created_at=group.created_at,
            updated_at=group.updated_at,
            member_ids=memberships.get(group.id, []),
        )
        for group in groups
    ]


@router.post("/", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
def create_group(
    payload: GroupCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> GroupRead:
    resolved_client_id = _resolve_client_id(current_user, payload.client_id)
    _validate_athletes(session, resolved_client_id, payload.member_ids)

    group = Group(
        client_id=resolved_client_id,
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
        client_id=group.client_id,
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

    resolved_client_id = _resolve_client_id(current_user, group.client_id)
    if group.client_id != resolved_client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    if payload.name is not None:
        group.name = payload.name
    if payload.description is not None:
        group.description = payload.description

    if payload.member_ids is not None:
        _validate_athletes(session, resolved_client_id, payload.member_ids)
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
        client_id=group.client_id,
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

    resolved_client_id = _resolve_client_id(current_user, group.client_id)
    if group.client_id != resolved_client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    session.exec(delete(GroupMembership).where(GroupMembership.group_id == group.id))
    session.delete(group)
    session.commit()
