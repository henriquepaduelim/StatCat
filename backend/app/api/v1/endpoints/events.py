"""API endpoints for events management."""
from datetime import datetime
from typing import Iterable, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, or_
from sqlmodel import Session, select

from app.api.deps import SessionDep, get_current_active_user
from app.models.event import Event, EventParticipant, Notification, ParticipantStatus
from app.models.event_team_link import EventTeamLink
from app.models.team import CoachTeamLink
from app.models.user import User
from app.schemas.event import (
    EventConfirmation,
    EventCreate,
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


def _get_team_coach_user_ids(db: Session, team_ids: Iterable[int]) -> set[int]:
    unique_ids = {team_id for team_id in team_ids or [] if team_id is not None}
    if not unique_ids:
        return set()
    rows = db.exec(select(CoachTeamLink.user_id).where(CoachTeamLink.team_id.in_(unique_ids))).all()
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


def _ensure_user_participants(db: Session, event: Event, user_ids: Iterable[int]) -> None:
    normalized = {user_id for user_id in user_ids if user_id is not None}
    if not normalized or not event.id:
        return
    existing_rows = db.exec(
        select(EventParticipant.user_id).where(
            EventParticipant.event_id == event.id,
            EventParticipant.user_id != None,
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
    # Create event
    event = Event(
        name=event_in.name,
        date=event_in.date,
        time=event_in.time,
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
    _ensure_user_participants(db, event, invitee_user_ids)
    
    team_roster_ids = get_team_roster_athlete_ids(db, team_ids)
    explicit_athlete_ids = set(event_in.athlete_ids)
    all_athlete_ids = sorted(explicit_athlete_ids.union(team_roster_ids))
    
    # Create participants for athletes
    # Athletes don't have user accounts, so user_id is None
    for athlete_id in all_athlete_ids:
        participant = EventParticipant(
            event_id=event.id,
            user_id=None,  # Athletes don't have user accounts
            athlete_id=athlete_id,
            status=ParticipantStatus.INVITED,
        )
        db.add(participant)
    
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
) -> List[Event]:
    """List all events, optionally filtered."""
    stmt = select(Event)
    
    # Filter by team if provided (include multi-team associations)
    if team_id is not None:
        linked_event_ids = select(EventTeamLink.event_id).where(EventTeamLink.team_id == team_id)
        stmt = stmt.where(or_(Event.team_id == team_id, Event.id.in_(linked_event_ids)))
    
    # Filter by date range
    if date_from:
        stmt = stmt.where(Event.date >= date_from)
    if date_to:
        stmt = stmt.where(Event.date <= date_to)
    
    stmt = stmt.order_by(Event.date.desc(), Event.time.desc())
    
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
    # Get events where user is organizer
    stmt_created = select(Event).where(Event.created_by_id == current_user.id)
    created_events = db.exec(stmt_created).all()
    
    # Get events where user is invited (not as athlete placeholder)
    stmt_invited = (
        select(Event)
        .join(EventParticipant)
        .where(
            EventParticipant.user_id == current_user.id,
            EventParticipant.athlete_id == None  # Only real user invitations, not athlete placeholders
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
    
    # Sort by date
    events = sorted(all_events.values(), key=lambda e: (e.date, e.time or ""), reverse=True)
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
        raise HTTPException(status_code=403, detail="Not authorized to update this event")
    
    # Track changes for notification
    changes = []
    
    if event_in.name and event_in.name != event.name:
        changes.append(f"Name changed to: {event_in.name}")
        event.name = event_in.name
    
    if event_in.date and event_in.date != event.date:
        changes.append(f"Date changed to: {event_in.date}")
        event.date = event_in.date
    
    if event_in.time is not None and event_in.time != event.time:
        changes.append(f"Time changed to: {event_in.time}")
        event.time = event_in.time
    
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
    
    event.updated_at = datetime.utcnow()

    should_sync_team_links = event_in.team_ids is not None or event_in.team_id is not None
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
        resolved_team_ids if resolved_team_ids else resolve_event_team_ids(db=db, event=event)
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
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check permission
    if event.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this event")

    # Remove participants and notifications explicitly to avoid FK issues
    db.exec(delete(EventParticipant).where(EventParticipant.event_id == event_id))
    db.exec(delete(Notification).where(Notification.event_id == event_id))
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

    if not participant and current_user.athlete_id is not None:
        stmt = select(EventParticipant).where(
            EventParticipant.event_id == event_id,
            EventParticipant.athlete_id == current_user.athlete_id,
        )
        participant = db.exec(stmt).first()
        if participant:
            participant.user_id = current_user.id

    if not participant:
        # User wasn't invited, but allow them to respond
        participant = EventParticipant(
            event_id=event_id,
            user_id=current_user.id,
            status=confirmation.status,
            responded_at=datetime.utcnow(),
        )
        db.add(participant)
    else:
        participant.status = confirmation.status
        participant.responded_at = datetime.utcnow()
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
