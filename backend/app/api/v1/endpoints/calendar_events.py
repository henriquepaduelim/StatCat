from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime
from typing import Iterable

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, delete, select

from app.api.deps import get_current_active_user
from app.db.session import get_session
from app.models.athlete import Athlete, AthleteGender, AthleteStatus
from app.models.calendar_event import CalendarEvent, CalendarEventAttendee
from app.models.google_credential import GoogleCredential
from app.models.group import Group, GroupMembership
from app.models.user import User
from app.schemas.calendar_event import (
    CalendarEventCreate,
    CalendarEventFilters,
    CalendarEventRead,
    CalendarEventUpdate,
)
from app.services.google_calendar import (
    GoogleAPIError,
    create_calendar_event,
    delete_calendar_event,
    update_calendar_event,
)

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


def _calculate_age(born: date, reference: date) -> int:
    years = reference.year - born.year
    if (reference.month, reference.day) < (born.month, born.day):
        years -= 1
    return years


def _serialize_event(
    event: CalendarEvent,
    attendees: list[CalendarEventAttendee],
) -> CalendarEventRead:
    return CalendarEventRead(
        id=event.id,
        client_id=event.client_id,
        created_by_id=event.created_by_id,
        calendar_id=event.calendar_id,
        status=event.status,
        summary=event.summary,
        description=event.description,
        location=event.location,
        event_type=event.event_type,
        start_at=event.start_at,
        end_at=event.end_at,
        time_zone=event.time_zone,
        google_event_id=event.google_event_id,
        meeting_url=event.meeting_url,
        color_id=event.color_id,
        created_at=event.created_at,
        updated_at=event.updated_at,
        attendees=[
            {
                "id": attendee.id,
                "athlete_id": attendee.athlete_id,
                "email": attendee.email,
                "display_name": attendee.display_name,
                "status": attendee.status,
                "response_at": attendee.response_at,
            }
            for attendee in attendees
        ],
    )


def _load_attendees(session: Session, event_ids: Iterable[int]) -> dict[int, list[CalendarEventAttendee]]:
    mapping: dict[int, list[CalendarEventAttendee]] = defaultdict(list)
    ids = tuple(event_ids)
    if not ids:
        return mapping
    statement = select(CalendarEventAttendee).where(CalendarEventAttendee.event_id.in_(ids))
    for attendee in session.exec(statement):
        mapping[attendee.event_id].append(attendee)
    return mapping


def _fetch_groups(session: Session, client_id: int, group_ids: list[int]) -> list[Group]:
    if not group_ids:
        return []
    statement = select(Group).where(Group.id.in_(tuple(group_ids)))
    groups = session.exec(statement).all()
    missing = sorted(set(group_ids) - {group.id for group in groups})
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"missingGroups": missing},
        )
    mismatched = [group.id for group in groups if group.client_id != client_id]
    if mismatched:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"unauthorizedGroups": mismatched},
        )
    return groups


def _collect_group_members(session: Session, group_ids: list[int]) -> set[int]:
    if not group_ids:
        return set()
    statement = select(GroupMembership).where(GroupMembership.group_id.in_(tuple(group_ids)))
    return {membership.athlete_id for membership in session.exec(statement)}


def _apply_filters(
    session: Session,
    client_id: int,
    filters: CalendarEventFilters | None,
    reference_date: date,
) -> set[int]:
    if filters is None:
        return set()

    statement = select(Athlete).where(Athlete.client_id == client_id)

    if filters.genders:
        try:
            valid_genders = {
                AthleteGender(gender) if not isinstance(gender, AthleteGender) else gender
                for gender in filters.genders
            }
        except ValueError as exc:  # pragma: no cover - defensive
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"invalidGender": str(exc)},
            ) from exc
        statement = statement.where(Athlete.gender.in_(tuple(valid_genders)))

    if filters.statuses:
        try:
            valid_statuses = {
                AthleteStatus(status) if not isinstance(status, AthleteStatus) else status
                for status in filters.statuses
            }
        except ValueError as exc:  # pragma: no cover - defensive
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"invalidStatus": str(exc)},
            ) from exc
        statement = statement.where(Athlete.status.in_(tuple(valid_statuses)))

    if filters.teams:
        statement = statement.where(Athlete.club_affiliation.in_(tuple(filters.teams)))

    candidates = session.exec(statement).all()

    result: set[int] = set()
    for athlete in candidates:
        if filters.age_min is not None or filters.age_max is not None:
            age = _calculate_age(athlete.birth_date, reference_date)
            if filters.age_min is not None and age < filters.age_min:
                continue
            if filters.age_max is not None and age > filters.age_max:
                continue
        result.add(athlete.id)
    return result


def _load_athletes_by_ids(
    session: Session,
    client_id: int,
    athlete_ids: Iterable[int],
) -> list[Athlete]:
    ids = tuple(set(athlete_ids))
    if not ids:
        return []
    statement = select(Athlete).where(Athlete.id.in_(ids), Athlete.client_id == client_id)
    athletes = session.exec(statement).all()
    found = {athlete.id for athlete in athletes}
    missing = sorted(set(ids) - found)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"missingAthletes": missing},
        )
    return athletes


def _collect_attendees(
    session: Session,
    client_id: int,
    manual_ids: list[int],
    group_ids: list[int],
    filters: CalendarEventFilters | None,
    reference_date: date,
) -> list[Athlete]:
    _fetch_groups(session, client_id, group_ids)
    resolved_ids = set(manual_ids)
    resolved_ids.update(_collect_group_members(session, group_ids))
    resolved_ids.update(_apply_filters(session, client_id, filters, reference_date))

    athletes = _load_athletes_by_ids(session, client_id, resolved_ids)
    invalid_emails = [athlete.id for athlete in athletes if not athlete.email]
    if invalid_emails:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"missingEmails": invalid_emails},
        )
    athletes.sort(key=lambda athlete: (athlete.last_name.lower(), athlete.first_name.lower()))
    return athletes


def _persist_attendees(
    session: Session,
    event_id: int,
    athletes: list[Athlete],
    actor: User,
) -> list[CalendarEventAttendee]:
    session.exec(delete(CalendarEventAttendee).where(CalendarEventAttendee.event_id == event_id))
    attendees: list[CalendarEventAttendee] = []
    for athlete in athletes:
        display = f"{athlete.first_name} {athlete.last_name}".strip()
        attendee = CalendarEventAttendee(
            event_id=event_id,
            athlete_id=athlete.id,
            email=athlete.email,
            display_name=display,
            invited_via="google",
            status="pending",
            response_source="system",
        )
        attendees.append(attendee)
    if attendees:
        session.add_all(attendees)
    return attendees


def _build_metadata(
    manual_ids: list[int],
    group_ids: list[int],
    filters: CalendarEventFilters | None,
) -> dict:
    return {
        "manual_attendee_ids": manual_ids,
        "group_ids": group_ids,
        "filters": filters.model_dump(exclude_none=True) if filters else None,
    }


@router.get("/", response_model=list[CalendarEventRead])
def list_events(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
    client_id: int | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
) -> list[CalendarEventRead]:
    resolved_client_id = _resolve_client_id(current_user, client_id)

    statement = select(CalendarEvent).where(CalendarEvent.client_id == resolved_client_id)
    if start is not None:
        statement = statement.where(CalendarEvent.start_at >= start)
    if end is not None:
        statement = statement.where(CalendarEvent.start_at <= end)
    statement = statement.order_by(CalendarEvent.start_at)

    events = session.exec(statement).all()
    attendees_mapping = _load_attendees(session, [event.id for event in events])

    return [
        _serialize_event(event, attendees_mapping.get(event.id, []))
        for event in events
    ]


@router.get("/{event_id}", response_model=CalendarEventRead)
def get_event(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> CalendarEventRead:
    event = session.get(CalendarEvent, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    resolved_client_id = _resolve_client_id(current_user, event.client_id)
    if event.client_id != resolved_client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    attendees = session.exec(
        select(CalendarEventAttendee).where(CalendarEventAttendee.event_id == event.id)
    ).all()
    return _serialize_event(event, attendees)


@router.post("/", response_model=CalendarEventRead, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: CalendarEventCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> CalendarEventRead:
    resolved_client_id = _resolve_client_id(current_user, payload.client_id)

    if payload.end_at <= payload.start_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_at must be after start_at",
        )

    filters = payload.filters
    reference_date = payload.start_at.date()

    athletes = _collect_attendees(
        session=session,
        client_id=resolved_client_id,
        manual_ids=payload.attendee_ids,
        group_ids=payload.group_ids,
        filters=filters,
        reference_date=reference_date,
    )

    if not athletes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No attendees matched the provided criteria",
        )

    credential = session.exec(
        select(GoogleCredential).where(GoogleCredential.user_id == current_user.id)
    ).first()
    if credential is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connect Google Calendar before creating events",
        )
    if credential.client_id != resolved_client_id:
        credential.client_id = resolved_client_id
        session.add(credential)
        session.commit()
        session.refresh(credential)

    event = CalendarEvent(
        client_id=resolved_client_id,
        created_by_id=current_user.id,
        calendar_id=payload.calendar_id or credential.calendar_id or "primary",
        summary=payload.summary,
        description=payload.description,
        location=payload.location,
        event_type=payload.event_type,
        status=payload.status or "scheduled",
        start_at=payload.start_at,
        end_at=payload.end_at,
        time_zone=payload.time_zone,
        selection_metadata=_build_metadata(payload.attendee_ids, payload.group_ids, filters),
    )
    session.add(event)
    session.commit()
    session.refresh(event)

    attendees_models = _persist_attendees(session, event.id, athletes, current_user)
    session.commit()

    try:
        google_payload = create_calendar_event(session, credential, event, attendees_models)
    except GoogleAPIError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    event.google_event_id = google_payload.get("id")
    event.meeting_url = google_payload.get("hangoutLink") or google_payload.get("htmlLink")
    event.color_id = google_payload.get("colorId")
    session.add(event)
    session.commit()
    session.refresh(event)

    persisted_attendees = session.exec(
        select(CalendarEventAttendee).where(CalendarEventAttendee.event_id == event.id)
    ).all()

    return _serialize_event(event, persisted_attendees)


@router.patch("/{event_id}", response_model=CalendarEventRead)
def update_event(
    event_id: int,
    payload: CalendarEventUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> CalendarEventRead:
    event = session.get(CalendarEvent, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    resolved_client_id = _resolve_client_id(current_user, event.client_id)
    if event.client_id != resolved_client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    if payload.summary is not None:
        event.summary = payload.summary
    if payload.description is not None:
        event.description = payload.description
    if payload.location is not None:
        event.location = payload.location
    if payload.event_type is not None:
        event.event_type = payload.event_type
    if payload.start_at is not None:
        event.start_at = payload.start_at
    if payload.end_at is not None:
        event.end_at = payload.end_at
    if payload.time_zone is not None:
        event.time_zone = payload.time_zone
    if payload.status is not None:
        event.status = payload.status
    if payload.calendar_id is not None:
        event.calendar_id = payload.calendar_id

    if event.end_at <= event.start_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_at must be after start_at",
        )

    current_metadata = event.selection_metadata or {}
    manual_ids = (
        payload.attendee_ids
        if payload.attendee_ids is not None
        else current_metadata.get("manual_attendee_ids", [])
    )
    group_ids = (
        payload.group_ids
        if payload.group_ids is not None
        else current_metadata.get("group_ids", [])
    )

    if payload.filters is not None:
        filters = payload.filters
    else:
        stored_filters = current_metadata.get("filters")
        filters = (
            CalendarEventFilters(**stored_filters)
            if isinstance(stored_filters, dict)
            else None
        )

    credential = session.exec(
        select(GoogleCredential).where(GoogleCredential.user_id == current_user.id)
    ).first()
    if credential is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connect Google Calendar before updating events",
        )
    if credential.client_id != resolved_client_id:
        credential.client_id = resolved_client_id
        session.add(credential)
        session.commit()
        session.refresh(credential)

    attendees = _collect_attendees(
        session=session,
        client_id=resolved_client_id,
        manual_ids=manual_ids,
        group_ids=group_ids,
        filters=filters,
        reference_date=event.start_at.date(),
    )

    if not attendees:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No attendees matched the provided criteria",
        )

    event.selection_metadata = _build_metadata(manual_ids, group_ids, filters)

    attendees_models = _persist_attendees(session, event.id, attendees, current_user)
    session.add(event)
    session.commit()
    session.refresh(event)

    try:
        google_payload = update_calendar_event(session, credential, event, attendees_models)
    except GoogleAPIError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    event.google_event_id = google_payload.get("id", event.google_event_id)
    event.meeting_url = google_payload.get("hangoutLink") or google_payload.get("htmlLink")
    event.color_id = google_payload.get("colorId", event.color_id)
    session.add(event)
    session.commit()
    session.refresh(event)

    persisted_attendees = session.exec(
        select(CalendarEventAttendee).where(CalendarEventAttendee.event_id == event.id)
    ).all()

    return _serialize_event(event, persisted_attendees)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> None:
    event = session.get(CalendarEvent, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    resolved_client_id = _resolve_client_id(current_user, event.client_id)
    if event.client_id != resolved_client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    credential = session.exec(
        select(GoogleCredential).where(GoogleCredential.user_id == current_user.id)
    ).first()
    if credential:
        try:
            delete_calendar_event(session, credential, event)
        except GoogleAPIError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    session.exec(delete(CalendarEventAttendee).where(CalendarEventAttendee.event_id == event.id))
    session.delete(event)
    session.commit()
