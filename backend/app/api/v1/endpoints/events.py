"""API endpoints for events management."""

from datetime import date as date_type, datetime, time as time_type, timezone
import logging
from typing import Iterable, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy import delete, or_
from sqlmodel import Session, select

from app.api.deps import SessionDep, ensure_roles, get_current_active_user
from app.core.config import settings
from app.core.security_token import security_token_manager
from app.models.event import Event, EventStatus, Notification
from app.models.event_participant import EventParticipant, ParticipantStatus
from app.models.event_team_link import EventTeamLink
from app.models.athlete import Athlete
from app.models.team import CoachTeamLink
from app.models.user import User, UserRole
from app.schemas.event import (
    EventConfirmation,
    EventCreate,
    EventParticipantsAdd,
    EventParticipantResponse,
    EventResponse,
    EventUpdate,
)
from app.services.notification_service import notification_service
from app.services.event_team_service import (
    attach_team_ids,
    ensure_roster_participants,
    get_event_athlete_ids,
    get_team_roster_athlete_ids,
    persist_event_team_links,
    resolve_event_team_ids,
)

router = APIRouter()
MANAGE_EVENT_ROLES = {UserRole.ADMIN, UserRole.STAFF, UserRole.COACH}
logger = logging.getLogger(__name__)


def _get_team_coach_user_ids(db: Session, team_ids: Iterable[int]) -> set[int]:
    unique_ids = {team_id for team_id in team_ids or [] if team_id is not None}
    if not unique_ids:
        return set()
    rows = db.exec(
        select(CoachTeamLink.user_id).where(CoachTeamLink.team_id.in_(unique_ids))
    ).all()
    normalized: set[int] = set()
    for row in rows:
        value = row[0] if isinstance(row, tuple) else row
        if value is not None:
            normalized.add(value)
    return normalized


def _collect_invitee_user_ids(
    db: Session,
    team_ids: Iterable[int],
    requested_user_ids: Iterable[int] | None,
    coach_id: Optional[int],
) -> set[int]:
    invitees = set(requested_user_ids or [])
    invitees.update(_get_team_coach_user_ids(db, team_ids))
    if coach_id:
        invitees.add(coach_id)
    return invitees


def _coach_team_ids(db: Session, coach_id: int) -> set[int]:
    rows = db.exec(
        select(CoachTeamLink.team_id).where(CoachTeamLink.user_id == coach_id)
    ).all()
    return {
        row[0] if isinstance(row, tuple) else row for row in rows if row is not None
    }


def _ensure_user_participants(
    db: Session, event: Event, user_ids: Iterable[int]
) -> None:
    normalized = {user_id for user_id in user_ids if user_id is not None}
    if not normalized or not event.id:
        return
    existing_rows = db.exec(
        select(EventParticipant.user_id).where(
            EventParticipant.event_id == event.id,
            EventParticipant.user_id is not None, # Changed != None to is not None
        )
    ).all()
    existing = {row[0] for row in existing_rows if row and row[0] is not None}
    missing = normalized - existing
    for user_id in missing:
        db.add(
            EventParticipant(
                event_id=event.id,
                user_id=user_id,
                status=ParticipantStatus.INVITED,
            )
        )


@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    *,
    db: SessionDep,
    current_user: User = Depends(get_current_active_user),
    event_in: EventCreate,
    background_tasks: BackgroundTasks,
) -> Event:
    """Create a new event and notify invitees."""
    ensure_roles(current_user, MANAGE_EVENT_ROLES)
    # Create event
    event = Event(
        name=event_in.name,
        event_date=event_in.event_date,
        start_time=_parse_time_str(event_in.start_time),
        location=event_in.location,
        notes=event_in.notes,
        # team_id is legacy; keep null and rely on EventTeamLink as source of truth
        team_id=None,
        coach_id=event_in.coach_id,
        created_by_id=current_user.id,
    )
    db.add(event)
    db.flush()

    team_ids_input = event_in.team_ids or (
        [event_in.team_id] if event_in.team_id is not None else []
    )
    team_ids = resolve_event_team_ids(
        db=db,
        event=event,
        requested_team_ids=team_ids_input,
        invited_athlete_ids=event_in.athlete_ids,
    )
    persist_event_team_links(db, event, team_ids)
    invitee_user_ids = _collect_invitee_user_ids(
        db=db,
        team_ids=team_ids,
        requested_user_ids=event_in.invitee_ids,
        coach_id=event.coach_id,
    )
    # Map invited athletes to their user accounts (if they have one) so they can receive emails
    team_roster_ids = get_team_roster_athlete_ids(db, team_ids)
    explicit_athlete_ids = set(event_in.athlete_ids)
    all_athlete_ids = sorted(explicit_athlete_ids.union(team_roster_ids))
    athlete_user_rows = db.exec(
        select(User.athlete_id, User.id).where(User.athlete_id.in_(all_athlete_ids))
    ).all()
    athlete_user_map = {
        row[0]: row[1]
        for row in athlete_user_rows
        if row[0] is not None and row[1] is not None
    }
    invitee_user_ids.update(athlete_user_map.values())

    _ensure_user_participants(db, event, invitee_user_ids)

    existing_participants = db.exec(
        select(EventParticipant).where(
            EventParticipant.event_id == event.id, EventParticipant.user_id is not None # Changed != None to is not None
        )
    ).all()
    participants_by_user: dict[int, EventParticipant] = {
        ep.user_id: ep for ep in existing_participants if ep.user_id is not None
    }

    # Create or update participants for athletes (link user_id when available)
    for athlete_id in all_athlete_ids:
        linked_user_id = athlete_user_map.get(athlete_id)
        if linked_user_id and linked_user_id in participants_by_user:
            participant = participants_by_user[linked_user_id]
            if participant.athlete_id is None:
                participant.athlete_id = athlete_id
            if participant.status is None:
                participant.status = ParticipantStatus.INVITED
            db.add(participant)
            continue
        db.add(
            EventParticipant(
                event_id=event.id,
                user_id=linked_user_id,
                athlete_id=athlete_id,
                status=ParticipantStatus.INVITED,
            )
        )

    db.commit()
    db.refresh(event)
    attach_team_ids(db, [event])

    # Send notifications
    user_invitees_list = sorted(invitee_user_ids)
    all_invitee_ids = user_invitees_list + event_in.athlete_ids
    if all_invitee_ids:
        await notification_service.notify_event_created(
            db=db,
            event=event,
            invitee_ids=user_invitees_list,
            send_email=event_in.send_email,
            send_push=event_in.send_push,
            background_tasks=background_tasks,
        )

    # Refresh to get participants
    db.refresh(event)
    return event


@router.get("/", response_model=List[EventResponse])
def list_events(
    *,
    db: SessionDep,
    current_user: User = Depends(get_current_active_user),
    team_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    athlete_id: Optional[int] = None,
    page: int = 1,
    size: int = 50,
) -> List[Event]:
    """List all events, optionally filtered."""
    if current_user.role == UserRole.COACH:
        allowed_team_ids = _coach_team_ids(db, current_user.id)
        if team_id is not None and team_id not in allowed_team_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed"
            )
        if not allowed_team_ids and team_id is None:
            return []
    stmt = select(Event)
    # Pagination constraints
    if page < 1:
        page = 1
    if size < 1:
        size = 50
    if size > 200:
        size = 200

    # Filter by team if provided (include multi-team associations)
    if team_id is not None:
        linked_event_ids = select(EventTeamLink.event_id).where(
            EventTeamLink.team_id == team_id
        )
        stmt = stmt.where(Event.id.in_(linked_event_ids))
    elif current_user.role == UserRole.COACH:
        allowed_team_ids = _coach_team_ids(db, current_user.id)
        if allowed_team_ids:
            linked_event_ids = select(EventTeamLink.event_id).where(
                EventTeamLink.team_id.in_(allowed_team_ids)
            )
            stmt = stmt.where(Event.id.in_(linked_event_ids))

    # Filter by date range
    parsed_from = _parse_date_str(date_from)
    parsed_to = _parse_date_str(date_to)
    if parsed_from:
        stmt = stmt.where(Event.event_date >= parsed_from)
    if parsed_to:
        stmt = stmt.where(Event.event_date <= parsed_to)

    if athlete_id is not None:
        stmt = stmt.join(EventParticipant).where(
            EventParticipant.athlete_id == athlete_id
        )

    stmt = stmt.order_by(Event.event_date.desc(), Event.start_time.desc())
    offset = (page - 1) * size
    stmt = stmt.offset(offset).limit(size)

    events = db.exec(stmt).all()
    attach_team_ids(db, events)
    return events


@router.get("/my-events", response_model=List[EventResponse])
def list_my_events(
    *,
    db: SessionDep,
    current_user: User = Depends(get_current_active_user),
) -> List[Event]:
    """List events where current user deve ter visibilidade confiável."""
    log_payload: dict[str, object] = {
        "user_id": current_user.id,
        "role": getattr(current_user, "role", None),
    }

    def _add(store: dict[int, Event], items: list[Event]) -> None:
        for event in items:
            if event.id is None:
                continue
            store.setdefault(event.id, event)

    # Admin/Staff: veem tudo ordenado
    if current_user.role in {UserRole.ADMIN, UserRole.STAFF}:
        events = db.exec(select(Event)).all()
        events = sorted(
            events,
            key=lambda e: (e.event_date or date_type.min, e.start_time or time_type.min),
            reverse=True,
        )
        log_payload["mode"] = "admin_staff_all"
        log_payload["total_returned"] = len(events)
        logger.info("my-events lookup: %s", log_payload)
        attach_team_ids(db, events)
        return events

    all_events: dict[int, Event] = {}

    created_events = db.exec(
        select(Event).where(Event.created_by_id == current_user.id)
    ).all()
    _add(all_events, created_events)
    log_payload["created_count"] = len(created_events)

    invited_events = db.exec(
        select(Event)
        .join(EventParticipant)
        .where(EventParticipant.user_id == current_user.id)
    ).all()
    _add(all_events, invited_events)
    log_payload["invited_count"] = len(invited_events)

    # Athlete: eventos pelo participant.athlete_id e pelo time associado
    athlete_events: list[Event] = []
    team_roster_events: list[Event] = []
    if current_user.role == UserRole.ATHLETE and current_user.athlete_id is not None:
        athlete_events = db.exec(
            select(Event)
            .join(EventParticipant)
            .where(EventParticipant.athlete_id == current_user.athlete_id)
        ).all()
        _add(all_events, athlete_events)

        # eventos do time do atleta (via Event.team_id ou EventTeamLink)
        athlete_team_id = None
        athlete = db.get(Athlete, current_user.athlete_id)
        if athlete is not None:
            athlete_team_id = athlete.team_id
        if athlete_team_id is not None:
            team_roster_events = db.exec(
                select(Event)
                .join(EventTeamLink)
                .where(EventTeamLink.team_id == athlete_team_id)
            ).all()
            _add(all_events, team_roster_events)

    # Coach: eventos por times vinculados, coach_id e convites diretos
    coach_team_ids: set[int] = set()
    team_events: list[Event] = []
    linked_team_events: list[Event] = []
    coach_owned_events: list[Event] = []
    if current_user.role == UserRole.COACH:
        coach_owned_events = db.exec(
            select(Event).where(Event.coach_id == current_user.id)
        ).all()
        _add(all_events, coach_owned_events)

        coach_team_ids = _coach_team_ids(db, current_user.id)
        if coach_team_ids:
            linked_team_events = db.exec(
                select(Event)
                .join(EventTeamLink)
                .where(EventTeamLink.team_id.in_(coach_team_ids))
            ).all()
            _add(all_events, linked_team_events)

    events = sorted(
        all_events.values(),
        key=lambda e: (e.event_date or date_type.min, e.start_time or time_type.min),
        reverse=True,
    )
    log_payload.update(
        {
            "athlete_count": len(athlete_events),
            "team_roster_count": len(team_roster_events),
            "coach_owned_count": len(coach_owned_events),
            "team_events_count": len(team_events),
            "linked_team_events_count": len(linked_team_events),
            "coach_team_ids": sorted(coach_team_ids),
            "total_returned": len(events),
            "query_summary": {
                "created_by": f"Event.created_by_id == {current_user.id}",
                "invited": "JOIN EventParticipant.user_id",
                "athlete": (
                    f"JOIN EventParticipant.athlete_id == {current_user.athlete_id}"
                    if current_user.athlete_id is not None
                    else None
                ),
                "coach_id": f"Event.coach_id == {current_user.id}",
                "team_id": (
                    f"Event.team_id IN {sorted(coach_team_ids)}"
                    if coach_team_ids
                    else None
                ),
                "event_team_link": (
                    f"EventTeamLink.team_id IN {sorted(coach_team_ids)}"
                    if coach_team_ids
                    else None
                ),
            },
        }
    )
    logger.info("my-events lookup: %s", log_payload)
    attach_team_ids(db, events)
    return events


@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    *,
    db: SessionDep,
    current_user: User = Depends(get_current_active_user),
    event_id: int,
) -> Event:
    """Get a specific event by ID."""
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if current_user.role == UserRole.COACH:
        allowed_team_ids = _coach_team_ids(db, current_user.id)
        linked_team_ids = db.exec(
            select(EventTeamLink.team_id).where(EventTeamLink.event_id == event.id)
        ).all()
        linked_set = {
            row[0] if isinstance(row, tuple) else row
            for row in linked_team_ids
            if row is not None
        }
        if linked_set.intersection(allowed_team_ids):
            pass
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed"
            )
    if current_user.role == UserRole.ATHLETE:
        is_participant = db.exec(
            select(EventParticipant).where(
                EventParticipant.event_id == event.id,
                EventParticipant.athlete_id == current_user.athlete_id,
            )
        ).first()
    attach_team_ids(db, [event])
    return event


@router.get("/rsvp")
async def handle_rsvp_from_token(
    token: str,
    db: SessionDep,
    background_tasks: BackgroundTasks,
) -> RedirectResponse:
    """
    Handles one-click RSVP confirmation from email links.
    Verifies the token, updates participant status, and redirects to frontend.
    """
    data = security_token_manager.verify_token(token, salt="rsvp-event")
    if not data:
        # Redirect to a frontend error page or a generic RSVP page
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/rsvp-error?message=invalid_or_expired_link",
            status_code=status.HTTP_302_FOUND,
        )

    user_id = data.get("user_id")
    event_id = data.get("event_id")
    status_str = data.get("status")  # This will be 'confirmed' or 'declined'

    if not all([user_id, event_id, status_str]):
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/rsvp-error?message=missing_info",
            status_code=status.HTTP_302_FOUND,
        )

    # Validate status_str against ParticipantStatus enum
    try:
        new_status = ParticipantStatus(status_str.upper())
    except ValueError:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/rsvp-error?message=invalid_status",
            status_code=status.HTTP_302_FOUND,
        )

    event = db.get(Event, event_id)
    user = db.get(User, user_id)

    if not event or not user:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/rsvp-error?message=event_or_user_not_found",
            status_code=status.HTTP_302_FOUND,
        )

    participant = db.exec(
        select(EventParticipant).where(
            EventParticipant.event_id == event_id,
            EventParticipant.user_id == user_id,
        )
    ).first()

    if not participant:
        # Create participant if not already existing (e.g., direct RSVP link)
        participant = EventParticipant(
            event_id=event_id,
            user_id=user_id,
            status=new_status,
            responded_at=datetime.now(timezone.utc),
        )
        db.add(participant)
    else:
        participant.status = new_status
        participant.responded_at = datetime.now(timezone.utc)
        db.add(participant)

    db.commit()
    db.refresh(participant)

    # Notify organizer about the change
    await notification_service.notify_confirmation_received(
        db=db,
        event=event,
        participant=participant,
        status=new_status.value,  # Pass the enum value
        background_tasks=background_tasks,
    )

    return RedirectResponse(
        url=f"{settings.FRONTEND_URL}/rsvp-confirmation?status={new_status.value}&event_id={event_id}",
        status_code=status.HTTP_302_FOUND,
    )


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    *,
    db: SessionDep,
    current_user: User = Depends(get_current_active_user),
    event_id: int,
    event_in: EventUpdate,
    background_tasks: BackgroundTasks,
) -> Event:
    """Update an event and notify participants if requested."""
    ensure_roles(current_user, MANAGE_EVENT_ROLES)
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Check permission (only organizer can update)
    if event.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to update this event"
        )

    # Track changes for notification
    changes = []

    if event_in.name and event_in.name != event.name:
        changes.append(f"Name changed to: {event_in.name}")
        event.name = event_in.name

    if event_in.event_date and event_in.event_date != event.event_date:
        changes.append(f"Date changed to: {event_in.event_date}")
        event.event_date = event_in.event_date

    if event_in.start_time is not None and event_in.start_time != event.start_time:
        parsed_time = _parse_time_str(event_in.start_time)
        changes.append(f"Time changed to: {event_in.start_time}")
        event.start_time = parsed_time

    if event_in.location is not None and event_in.location != event.location:
        changes.append(f"Location changed to: {event_in.location}")
        event.location = event_in.location
    if event_in.notes is not None:
        if event.notes != event_in.notes:
            changes.append("Event notes were updated")
        event.notes = event_in.notes

    if event_in.status:
        try:
            event.status = EventStatus(event_in.status.upper())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status"
            )

    if event_in.team_id is not None:
        event.team_id = event_in.team_id

    if event_in.coach_id is not None:
        event.coach_id = event_in.coach_id

    event.updated_at = datetime.now(timezone.utc)

    should_sync_team_links = (
        event_in.team_ids is not None or event_in.team_id is not None
    )
    resolved_team_ids: list[int] = []

    db.add(event)

    if should_sync_team_links:
        invited_athletes = get_event_athlete_ids(db, event.id)
        resolved_team_ids = resolve_event_team_ids(
            db=db,
            event=event,
            requested_team_ids=event_in.team_ids,
            invited_athlete_ids=invited_athletes,
        )
        persist_event_team_links(db, event, resolved_team_ids)
        roster_ids = get_team_roster_athlete_ids(db, resolved_team_ids)
        ensure_roster_participants(db, event, roster_ids)

    team_ids_for_coaches = (
        resolved_team_ids
        if resolved_team_ids
        else resolve_event_team_ids(db=db, event=event)
    )
    auto_invitees = _collect_invitee_user_ids(
        db=db,
        team_ids=team_ids_for_coaches,
        requested_user_ids=None,
        coach_id=event.coach_id,
    )
    _ensure_user_participants(db, event, auto_invitees)

    db.commit()
    db.refresh(event)
    attach_team_ids(db, [event])

    # Send notifications if there are changes
    if changes and event_in.send_notification:
        await notification_service.notify_event_updated(
            db=db,
            event=event,
            changes=", ".join(changes),
            send_notification=True,
            background_tasks=background_tasks,
        )

    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    *,
    db: SessionDep,
    current_user: User = Depends(get_current_active_user),
    event_id: int,
) -> None:
    """Delete an event."""
    ensure_roles(current_user, MANAGE_EVENT_ROLES)
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Check permission
    if event.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to delete this event"
        )

    # Remove participants and notifications explicitly to avoid FK issues
    db.exec(delete(EventParticipant).where(EventParticipant.event_id == event_id))
    db.exec(delete(Notification).where(Notification.event_id == event_id))
    db.exec(delete(EventTeamLink).where(EventTeamLink.event_id == event_id))

    db.delete(event)
    db.commit()


@router.post("/{event_id}/remind")
async def send_event_reminder(
    *,
    db: SessionDep,
    current_user: User = Depends(get_current_active_user),
    event_id: int,
    hours_until: int = 24,
    background_tasks: BackgroundTasks,
) -> dict[str, int]:
    """Send reminder emails to confirmed participants for a specific event."""
    ensure_roles(current_user, MANAGE_EVENT_ROLES)
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    sent = await notification_service.send_event_reminders(
        db=db,
        event=event,
        hours_until=hours_until,
        background_tasks=background_tasks,
    )
    return {"reminders_sent": sent}


@router.post("/{event_id}/participants", response_model=EventResponse)
async def add_event_participants(
    *,
    db: SessionDep,
    current_user: User = Depends(get_current_active_user),
    event_id: int,
    payload: EventParticipantsAdd,
    background_tasks: BackgroundTasks,
) -> Event:
    """Add manual participants to an existing event."""
    ensure_roles(current_user, MANAGE_EVENT_ROLES)
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    requested_user_ids = {
        user_id for user_id in payload.user_ids if user_id is not None
    }
    existing_rows = db.exec(
        select(EventParticipant.user_id).where(
            EventParticipant.event_id == event.id,
            EventParticipant.user_id is not None, # Changed != None to is not None
        )
    ).all()
    existing_user_ids = {row[0] for row in existing_rows if row and row[0] is not None}
    new_user_ids = sorted(requested_user_ids - existing_user_ids)

    _ensure_user_participants(db, event, requested_user_ids)
    if payload.athlete_ids:
        ensure_roster_participants(db, event, payload.athlete_ids)

    db.commit()
    db.refresh(event)
    attach_team_ids(db, [event])

    if new_user_ids and payload.send_notification:
        await notification_service.notify_event_created(
            db=db,
            event=event,
            invitee_ids=new_user_ids,
            send_email=True,
            send_push=False,
            background_tasks=background_tasks,
        )
        db.refresh(event)

    return event


@router.delete(
    "/{event_id}/participants/{user_id}", status_code=status.HTTP_204_NO_CONTENT
)
def remove_event_participant(
    *,
    db: SessionDep,
    current_user: User = Depends(get_current_active_user),
    event_id: int,
    user_id: int,
) -> None:
    """Remove a participant from an event."""
    ensure_roles(current_user, MANAGE_EVENT_ROLES)
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    participant = db.exec(
        select(EventParticipant).where(
            EventParticipant.event_id == event_id,
            EventParticipant.user_id == user_id,
        )
    ).first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Participant not found"
        )

    db.delete(participant)
    db.commit()


@router.post("/{event_id}/confirm", response_model=EventParticipantResponse)
async def confirm_event_attendance(
    *,
    db: SessionDep,
    current_user: User = Depends(get_current_active_user),
    event_id: int,
    confirmation: EventConfirmation,
    background_tasks: BackgroundTasks,
) -> EventParticipant:
    """Confirm, decline, or mark maybe for event attendance."""
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Find or create participant
    stmt = select(EventParticipant).where(
        EventParticipant.event_id == event_id,
        EventParticipant.user_id == current_user.id,
    )
    participant = db.exec(stmt).first()

    if not participant and current_user.athlete_id is not None:
        stmt = select(EventParticipant).where(
            EventParticipant.event_id == event_id,
            EventParticipant.athlete_id == current_user.athlete_id,
        )
        participant = db.exec(stmt).first()
        if participant:
            participant.user_id = current_user.id

    status_enum = ParticipantStatus(confirmation.status.upper())

    if not participant:
        # User wasn't invited, but allow them to respond
        participant = EventParticipant(
            event_id=event_id,
            user_id=current_user.id,
            status=status_enum,
            responded_at=datetime.now(timezone.utc),
        )
        db.add(participant)
    else:
        participant.status = status_enum
        participant.responded_at = datetime.now(timezone.utc)
        db.add(participant)

    db.commit()
    db.refresh(participant)

    # Notify organizer
    await notification_service.notify_confirmation_received(
        db=db,
        event=event,
        participant=participant,
        status=status_enum.value,  # Pass the enum value
        background_tasks=background_tasks,
    )

    return participant


@router.get("/{event_id}/participants", response_model=List[EventParticipantResponse])
def get_event_participants(
    *,
    db: SessionDep,
    current_user: User = Depends(get_current_active_user),
    event_id: int,
) -> List[EventParticipant]:
    """Get all participants for an event."""
    ensure_roles(current_user, MANAGE_EVENT_ROLES)
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    stmt = select(EventParticipant).where(EventParticipant.event_id == event_id)
    participants = db.exec(stmt).all()
    return participants


def _parse_date_str(value: Optional[str]) -> Optional[date_type]:
    if not value:
        return None
    try:
        return date_type.fromisoformat(value)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD.",
        )


def _parse_time_str(value: Optional[str]) -> Optional[time_type]:
    if value is None:
        return None
    v = value.strip()
    if not v:
        return None
    try:
        return time_type.fromisoformat(v)
    except ValueError:
        try:
            return datetime.strptime(v, "%H:%M").time()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid time format. Use HH:MM.",
            )
