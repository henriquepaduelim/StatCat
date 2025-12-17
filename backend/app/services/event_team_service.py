"""Helper utilities for synchronizing event-to-team associations."""
from __future__ import annotations

from collections import defaultdict
from typing import Iterable, Sequence

from sqlalchemy import delete
from sqlmodel import Session, select

from app.models.athlete import Athlete
from app.models.event import Event
from app.models.event_participant import EventParticipant, ParticipantStatus
from app.models.event_team_link import EventTeamLink


def _normalize_ids(ids: Iterable[int | None] | None) -> set[int]:
    return {identifier for identifier in ids or [] if identifier is not None}


def _team_ids_from_athletes(db: Session, athlete_ids: Iterable[int] | None) -> set[int]:
    athlete_ids = list(athlete_ids or [])
    if not athlete_ids:
        return set()
    rows = db.exec(select(Athlete.team_id).where(Athlete.id.in_(athlete_ids))).all()
    normalized: set[int] = set()
    for row in rows:
        value = row[0] if isinstance(row, tuple) else row
        if value is not None:
            normalized.add(value)
    return normalized


def resolve_event_team_ids(
    db: Session,
    event: Event,
    requested_team_ids: Iterable[int | None] | None = None,
    invited_athlete_ids: Iterable[int] | None = None,
) -> list[int]:
    """Compute the final set of team ids that should be associated with an event."""
    resolved = _normalize_ids(requested_team_ids)

    if requested_team_ids is None and event.id:
        existing = get_event_team_id_map(db, [event.id]).get(event.id, [])
        resolved.update(existing)

    resolved.update(_team_ids_from_athletes(db, invited_athlete_ids))

    if event.team_id is not None:
        resolved.add(event.team_id)

    return sorted(resolved)


def persist_event_team_links(db: Session, event: Event, team_ids: Iterable[int]) -> None:
    """Persist the provided team ids for the event and refresh the cached property."""
    if not event.id:
        return

    db.exec(delete(EventTeamLink).where(EventTeamLink.event_id == event.id))
    unique_ids = sorted({team_id for team_id in team_ids if team_id is not None})
    for team_id in unique_ids:
        db.add(EventTeamLink(event_id=event.id, team_id=team_id))
    event.set_team_ids(unique_ids)


def get_event_team_id_map(db: Session, event_ids: Sequence[int]) -> dict[int, list[int]]:
    """Return mapping of event_id -> associated team ids."""
    if not event_ids:
        return {}
    rows = db.exec(
        select(EventTeamLink).where(EventTeamLink.event_id.in_(event_ids))
    ).all()
    mapping: dict[int, list[int]] = defaultdict(list)
    for row in rows:
        mapping[row.event_id].append(row.team_id)
    return mapping


def attach_team_ids(db: Session, events: Sequence[Event]) -> None:
    """Populate the cached team ids on each event for serialization."""
    event_ids = [event.id for event in events if event.id is not None]
    mapping = get_event_team_id_map(db, event_ids)
    for event in events:
        if not event.id:
            event.set_team_ids([event.team_id] if event.team_id else [])
            continue
        team_ids = mapping.get(event.id, []).copy()
        if event.team_id is not None and event.team_id not in team_ids:
            team_ids.append(event.team_id)
        event.set_team_ids(sorted(team_ids))


def get_event_athlete_ids(db: Session, event_id: int) -> list[int]:
    """Return athlete ids currently invited to the event."""
    rows = db.exec(
        select(EventParticipant.athlete_id).where(EventParticipant.event_id == event_id)
    ).all()
    return [row[0] for row in rows if row and row[0] is not None]


def get_team_roster_athlete_ids(db: Session, team_ids: Iterable[int]) -> list[int]:
    """Return athlete ids belonging to the provided teams."""
    unique_ids = [team_id for team_id in sorted(set(team_ids)) if team_id is not None]
    if not unique_ids:
        return []
    rows = db.exec(
        select(Athlete.id).where(Athlete.team_id.in_(unique_ids))
    ).all()
    normalized: list[int] = []
    for row in rows:
        value = row[0] if isinstance(row, tuple) else row
        if value is not None:
            normalized.append(value)
    return normalized


def ensure_roster_participants(db: Session, event: Event, roster_athlete_ids: Iterable[int]) -> None:
    """Add missing event participants for roster athletes."""
    athlete_ids = {athlete_id for athlete_id in roster_athlete_ids if athlete_id is not None}
    if not athlete_ids or not event.id:
        return
    existing_rows = db.exec(
        select(EventParticipant.athlete_id).where(
            EventParticipant.event_id == event.id,
            EventParticipant.athlete_id != None,
        )
    ).all()
    existing_ids = {row[0] for row in existing_rows if row and row[0] is not None}
    missing = athlete_ids - existing_ids
    for athlete_id in missing:
        db.add(
            EventParticipant(
                event_id=event.id,
                athlete_id=athlete_id,
                user_id=None,
                status=ParticipantStatus.INVITED,
            )
        )
