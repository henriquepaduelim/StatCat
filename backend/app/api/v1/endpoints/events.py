"""API endpoints for events management."""

from datetime import date as date_type, datetime, time as time_type, timezone
from typing import Iterable, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy import delete, or_
from sqlmodel import Session, select

from app.api.deps import SessionDep, ensure_roles, get_current_active_user
from app.core.config import settings
from app.core.security_token import security_token_manager
from app.models.event import Event, EventStatus, Notification
from app.models.event_participant import EventParticipant, ParticipantStatus
from app.models.event_team_link import EventTeamLink
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
        team_id=event_in.team_id,
        coach_id=event_in.coach_id,
        created_by_id=current_user.id,
    )
    db.add(event)
    db.flush()

    team_ids = resolve_event_team_ids(
        db=db,
        event=event,
        requested_team_ids=event_in.team_ids,
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
        # Inclui eventos sem time para permitir convites de atletas sem time
        stmt = stmt.where(
            or_(
                Event.team_id == team_id,
                Event.id.in_(linked_event_ids),
                Event.team_id.is_(None),
            )
        )
    elif current_user.role == UserRole.COACH:
        allowed_team_ids = _coach_team_ids(db, current_user.id)
        if allowed_team_ids:
            linked_event_ids = select(EventTeamLink.event_id).where(
                EventTeamLink.team_id.in_(allowed_team_ids)
            )
            stmt = stmt.where(
                or_(
                    Event.team_id.in_(allowed_team_ids),
                    Event.id.in_(linked_event_ids),
                    Event.team_id.is_(None),
                )
            )

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
    """List events where current user is invited or organizer."""
    coach_team_ids = (
        _coach_team_ids(db, current_user.id)
        if current_user.role == UserRole.COACH
        else set()
    )
    # Get events where user is organizer
    stmt_created = select(Event).where(Event.created_by_id == current_user.id)
    created_events = db.exec(stmt_created).all()

    # Get events where user is invited (not as athlete placeholder)
    stmt_invited = (
        select(Event)
        .join(EventParticipant)
        .where(
            EventParticipant.user_id == current_user.id,
            EventParticipant.athlete_id is None,  # Changed == None to is None
        )
    )
    invited_events = db.exec(stmt_invited).all()

    athlete_events: list[Event] = []
    if current_user.athlete_id is not None:
        stmt_athlete = (
            select(Event)
            .join(EventParticipant)
            .where(EventParticipant.athlete_id == current_user.athlete_id)
        )
        athlete_events = db.exec(stmt_athlete).all()

    # Combine and deduplicate
    all_events = {e.id: e for e in created_events}
    for e in invited_events:
        if e.id not in all_events:
            all_events[e.id] = e
    for e in athlete_events:
        if e.id not in all_events:
            all_events[e.id] = e

    # If coach, restrict to own teams (direct or linked), but keep events without team
    if current_user.role == UserRole.COACH and coach_team_ids:
        filtered: dict[int, Event] = {}
        for event in all_events.values():
            if event.team_id and event.team_id in coach_team_ids:
                filtered[event.id] = event
                continue
            linked_ids = db.exec(
                select(EventTeamLink.team_id).where(EventTeamLink.event_id == event.id)
            ).all()
            linked_set = {
                row[0] if isinstance(row, tuple) else row
                for row in linked_ids
                if row is not None
            }
            if linked_set.intersection(coach_team_ids):
                filtered[event.id] = event
                continue
            # eventos sem time também ficam visíveis para coaches convidados/organizadores
            if event.team_id is None:
                filtered[event.id] = event
        all_events = filtered
    elif current_user.role == UserRole.COACH and not coach_team_ids:
        all_events = {}

    # Sort by date
    events = sorted(
        all_events.values(),
        key=lambda e: (e.event_date or date_type.min, e.start_time or time_type.min),
        reverse=True,
    )
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
        if event.team_id and event.team_id in allowed_team_ids:
            pass
        elif linked_set.intersection(allowed_team_ids):
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
        if (
            not is_participant
            and event.team_id
            and current_user.team_id != event.team_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed"
            )
    attach_team_ids(db, [event])
    return event


@router.get("/rsvp")
async def handle_rsvp_from_token(
    token: str,
    db: SessionDep,
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
    )
    return {"reminders_sent": sent}


@router.post("/{event_id}/participants", response_model=EventResponse)
async def add_event_participants(
    *,
    db: SessionDep,
    current_user: User = Depends(get_current_active_user),
    event_id: int,
    payload: EventParticipantsAdd,
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
