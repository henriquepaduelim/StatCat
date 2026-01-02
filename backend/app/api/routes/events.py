"""API endpoints for events management."""

from datetime import date as date_type, datetime, time as time_type, timezone
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, or_
from sqlmodel import select

from app.api.deps import SessionDep, get_current_active_user
from app.models.user import User, UserRole
from app.models.event import Event, EventParticipant, ParticipantStatus
from app.models.event_team_link import EventTeamLink
from app.models.team import CoachTeamLink
from app.schemas.event import (
    EventCreate,
    EventUpdate,
    EventResponse,
    EventConfirmation,
    EventParticipantResponse,
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
logger = logging.getLogger(__name__)


def _coach_team_ids(db: SessionDep, coach_id: int) -> set[int]:
    """Return team ids linked to the given coach."""
    rows = db.exec(
        select(CoachTeamLink.team_id).where(CoachTeamLink.user_id == coach_id)
    ).all()
    ids: set[int] = set()
    for row in rows:
        value = row[0] if isinstance(row, tuple) else row
        if value is not None:
            ids.add(int(value))
    return ids


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


@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    *,
    db: SessionDep,
    current_user: User = Depends(get_current_active_user),
    event_in: EventCreate,
) -> Event:
    """Create a new event and notify invitees."""
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

    # Create participants for invitee users
    for user_id in event_in.invitee_ids:
        participant = EventParticipant(
            event_id=event.id,
            user_id=user_id,
            status=ParticipantStatus.INVITED,
        )
        db.add(participant)

    team_roster_ids = get_team_roster_athlete_ids(db, team_ids)
    explicit_athlete_ids = set(event_in.athlete_ids)
    all_athlete_ids = sorted(explicit_athlete_ids.union(team_roster_ids))
    for athlete_id in all_athlete_ids:
        participant = EventParticipant(
            event_id=event.id,
            user_id=None,
            athlete_id=athlete_id,
            status=ParticipantStatus.INVITED,
        )
        db.add(participant)

    db.commit()
    db.refresh(event)
    attach_team_ids(db, [event])

    # Send notifications
    if event_in.invitee_ids:
        await notification_service.notify_event_created(
            db=db,
            event=event,
            invitee_ids=event_in.invitee_ids,
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
) -> List[Event]:
    """List all events, optionally filtered."""
    stmt = select(Event)

    # Filter by team if provided (include linked teams)
    if team_id is not None:
        linked_event_ids = select(EventTeamLink.event_id).where(
            EventTeamLink.team_id == team_id
        )
        stmt = stmt.where(or_(Event.team_id == team_id, Event.id.in_(linked_event_ids)))

    # Filter by date range
    parsed_from = _parse_date_str(date_from)
    parsed_to = _parse_date_str(date_to)
    if parsed_from:
        stmt = stmt.where(Event.event_date >= parsed_from)
    if parsed_to:
        stmt = stmt.where(Event.event_date <= parsed_to)

    stmt = stmt.order_by(Event.event_date.desc(), Event.start_time.desc())

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
    log_payload: dict[str, object] = {
        "user_id": current_user.id,
        "role": getattr(current_user, "role", None),
    }

    def _add_events(store: dict[int, Event], items: list[Event]) -> None:
        for event in items:
            if event.id is None:
                continue
            if event.id not in store:
                store[event.id] = event

    all_events: dict[int, Event] = {}

    created_events = db.exec(
        select(Event).where(Event.created_by_id == current_user.id)
    ).all()
    _add_events(all_events, created_events)
    log_payload["created_count"] = len(created_events)

    invited_events = (
        db.exec(
            select(Event)
            .join(EventParticipant)
            .where(EventParticipant.user_id == current_user.id)
        ).all()
    )
    _add_events(all_events, invited_events)
    log_payload["invited_count"] = len(invited_events)

    if current_user.role == UserRole.COACH:
        coach_team_ids = _coach_team_ids(db, current_user.id)
        log_payload["coach_team_ids"] = sorted(coach_team_ids)

        if coach_team_ids:
            team_events = db.exec(
                select(Event).where(Event.team_id.in_(coach_team_ids))
            ).all()
            _add_events(all_events, team_events)
            log_payload["team_events_count"] = len(team_events)

            linked_team_events = db.exec(
                select(Event)
                .join(EventTeamLink)
                .where(EventTeamLink.team_id.in_(coach_team_ids))
            ).all()
            _add_events(all_events, linked_team_events)
            log_payload["linked_team_events_count"] = len(linked_team_events)

        coached_events = db.exec(
            select(Event).where(Event.coach_id == current_user.id)
        ).all()
        _add_events(all_events, coached_events)
        log_payload["coach_id_events_count"] = len(coached_events)

    events = sorted(
        all_events.values(),
        key=lambda e: (e.event_date or date_type.min, e.start_time or time_type.min),
        reverse=True,
    )
    log_payload["total_returned"] = len(events)
    log_payload["query_summary"] = {
        "created_by": f"Event.created_by_id == {current_user.id}",
        "invited": "EventParticipant.user_id join",
        "team_id": "Event.team_id in coach_team_ids",
        "event_team_link": "EventTeamLink.team_id in coach_team_ids",
        "coach_id": f"Event.coach_id == {current_user.id}",
    }
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
    attach_team_ids(db, [event])
    return event


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    *,
    db: SessionDep,
    current_user: User = Depends(get_current_active_user),
    event_id: int,
    event_in: EventUpdate,
) -> Event:
    """Update an event and notify participants if requested."""
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
        event.notes = event_in.notes

    if event_in.status:
        event.status = event_in.status

    if event_in.team_id is not None:
        event.team_id = event_in.team_id

    if event_in.coach_id is not None:
        event.coach_id = event_in.coach_id

    event.updated_at = datetime.now(timezone.utc)
    should_sync_team_links = (
        event_in.team_ids is not None or event_in.team_id is not None
    )

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


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    *,
    db: SessionDep,
    current_user: User = Depends(get_current_active_user),
    event_id: int,
) -> None:
    """Delete an event."""
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Check permission
    if event.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to delete this event"
        )

    db.exec(delete(EventTeamLink).where(EventTeamLink.event_id == event_id))
    db.delete(event)
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

    if not participant:
        # User wasn't invited, but allow them to respond
        participant = EventParticipant(
            event_id=event_id,
            user_id=current_user.id,
            status=confirmation.status,
            responded_at=datetime.now(timezone.utc),
        )
        db.add(participant)
    else:
        participant.status = confirmation.status
        participant.responded_at = datetime.now(timezone.utc)
        db.add(participant)

    db.commit()
    db.refresh(participant)

    # Notify organizer
    await notification_service.notify_confirmation_received(
        db=db,
        event=event,
        participant=participant,
        status=confirmation.status,
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
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    stmt = select(EventParticipant).where(EventParticipant.event_id == event_id)
    participants = db.exec(stmt).all()
    return participants
