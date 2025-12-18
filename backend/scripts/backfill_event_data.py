"""Utility script to backfill event/team relationships and roster invites."""

from __future__ import annotations

import argparse
import sys
from collections import defaultdict
from pathlib import Path

from sqlalchemy import delete
from sqlmodel import Session, select

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from app.db.session import engine  # noqa: E402
from app.models.athlete import Athlete  # noqa: E402
from app.models.event import Event, EventParticipant, ParticipantStatus  # noqa: E402
from app.models.event_team_link import EventTeamLink  # noqa: E402


def gather_event_team_ids(session: Session, event_id: int) -> set[int]:
    team_ids: set[int] = set()
    event = session.get(Event, event_id)
    if not event:
        return team_ids
    if event.team_id:
        team_ids.add(event.team_id)
    participants = session.exec(
        select(EventParticipant).where(EventParticipant.event_id == event_id)
    ).all()
    athlete_ids = [p.athlete_id for p in participants if p.athlete_id is not None]
    if athlete_ids:
        rows = session.exec(
            select(Athlete.id, Athlete.team_id).where(Athlete.id.in_(athlete_ids))
        ).all()
        for _, team_id in rows:
            if team_id:
                team_ids.add(team_id)
    return team_ids


def ensure_event_team_links(session: Session, event: Event, team_ids: set[int]) -> int:
    session.exec(delete(EventTeamLink).where(EventTeamLink.event_id == event.id))
    if not team_ids:
        return 0
    for team_id in sorted(team_ids):
        session.add(EventTeamLink(event_id=event.id, team_id=team_id))
    return len(team_ids)


def ensure_roster_participants(
    session: Session, event: Event, team_ids: set[int]
) -> int:
    if not team_ids:
        return 0
    roster_athletes = session.exec(
        select(Athlete.id, Athlete.team_id).where(Athlete.team_id.in_(team_ids))
    ).all()
    roster_ids = {athlete_id for athlete_id, _ in roster_athletes}
    if not roster_ids:
        return 0
    existing = session.exec(
        select(EventParticipant.athlete_id).where(
            EventParticipant.event_id == event.id,
            EventParticipant.athlete_id != None,  # noqa: E711
        )
    ).all()
    existing_ids: set[int] = set()
    for row in existing:
        value = row[0] if isinstance(row, tuple) else row
        if value is not None:
            existing_ids.add(value)
    missing = roster_ids - existing_ids
    for athlete_id in missing:
        session.add(
            EventParticipant(
                event_id=event.id,
                athlete_id=athlete_id,
                user_id=None,
                status=ParticipantStatus.INVITED,
            )
        )
    return len(missing)


def run_backfill(attach_roster: bool) -> dict[str, int]:
    stats = defaultdict(int)
    with Session(engine) as session:
        events = session.exec(select(Event)).all()
        for event in events:
            team_ids = gather_event_team_ids(session, event.id)
            if not event.team_id and len(team_ids) == 1:
                event.team_id = next(iter(team_ids))
                stats["events_with_team_id_set"] += 1
            added_links = ensure_event_team_links(session, event, team_ids)
            if added_links:
                stats["events_with_links"] += 1
                stats["links_created"] += added_links
            if attach_roster and team_ids:
                added_participants = ensure_roster_participants(
                    session, event, team_ids
                )
                stats["participants_added"] += added_participants
            session.add(event)
        session.commit()
    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill event/team data.")
    parser.add_argument(
        "--attach-roster",
        action="store_true",
        help="Also add missing event participants for each team's roster.",
    )
    args = parser.parse_args()
    stats = run_backfill(attach_roster=args.attach_roster)
    print("Backfill complete:")
    for key, value in stats.items():
        print(f"- {key}: {value}")


if __name__ == "__main__":
    main()
