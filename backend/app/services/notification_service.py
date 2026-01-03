"""Notification service for coordinating email and push notifications."""

import logging
from typing import List
from datetime import datetime, timezone
from fastapi import BackgroundTasks
from sqlmodel import Session, select

from app.models.event import Event, Notification
from app.models.event_participant import EventParticipant, ParticipantStatus
from app.models.user import User
from app.services.email_service import email_service
from app.services.email_queue import enqueue_email

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing event notifications."""

    async def notify_event_created(
        self,
        db: Session,
        event: Event,
        invitee_ids: List[int],
        send_email: bool = True,
        send_push: bool = False,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        """Notify invitees about new event."""
        organizer = db.get(User, event.created_by_id)
        if not organizer:
            logger.error(f"Organizer not found for event {event.id}")
            return

        for user_id in invitee_ids:
            user = db.get(User, user_id)
            if not user:
                continue

            # Send email
            if send_email and user.email:
                enqueue_email(
                    background_tasks,
                    email_service.send_event_invitation,
                    user.email,
                    user.full_name,
                    event.name,
                    event.event_date,
                    event.start_time,
                    event.location,
                    event.notes,
                    organizer.full_name,
                    user.id,
                    event.id,
                    getattr(event, "end_date", None),
                    getattr(event, "end_time", None),
                )
                notification = Notification(
                    user_id=user_id,
                    event_id=event.id,
                    type="event_invite",
                    channel="email" if not send_push else "both",
                    title=f"You're invited: {event.name}",
                    body=f"Event on {event.event_date}"
                    + (f" at {event.start_time}" if event.start_time else ""),
                    sent=None,
                    sent_at=None,
                )
                db.add(notification)

        # Mark event as notified
        event.email_sent = send_email
        event.push_sent = send_push
        db.add(event)
        db.commit()

        logger.info(
            f"Sent event invitations for event {event.id} to {len(invitee_ids)} users"
        )

    async def notify_event_updated(
        self,
        db: Session,
        event: Event,
        changes: str,
        send_notification: bool = True,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        """Notify confirmed participants about event update."""
        if not send_notification:
            return

        # Get confirmed participants
        stmt = select(EventParticipant).where(
            EventParticipant.event_id == event.id,
            EventParticipant.status == ParticipantStatus.CONFIRMED,
        )
        participants = db.exec(stmt).all()

        for participant in participants:
            user = db.get(User, participant.user_id)
            if not user or not user.email:
                continue

            # NOTE: Assumes send_event_update has a similar updated signature
            enqueue_email(
                background_tasks,
                email_service.send_event_update,
                user.email,
                user.full_name,
                event.name,
                changes,
                event.event_date,
                event.start_time,
                event.location,
                getattr(event, "end_date", None),
                getattr(event, "end_time", None),
                event.id,
            )
            notification = Notification(
                user_id=user.id,
                event_id=event.id,
                type="event_update",
                channel="email",
                title=f"Event Updated: {event.name}",
                body=f"Changes: {changes}",
                sent=None,
                sent_at=None,
            )
            db.add(notification)

        event.updated_at = datetime.now(timezone.utc)
        db.add(event)
        db.commit()

        logger.info(
            f"Sent event update for event {event.id} to {len(participants)} confirmed participants"
        )

    async def send_event_reminders(
        self,
        db: Session,
        event: Event,
        hours_until: int = 24,
        background_tasks: BackgroundTasks | None = None,
    ) -> int:
        """Send reminder emails to confirmed participants."""
        stmt = select(EventParticipant).where(
            EventParticipant.event_id == event.id,
            EventParticipant.status == ParticipantStatus.CONFIRMED,
        )
        participants = db.exec(stmt).all()
        sent = 0
        for participant in participants:
            user = db.get(User, participant.user_id)
            if not user or not user.email:
                continue

            # NOTE: Assumes send_event_reminder has a similar updated signature
            enqueue_email(
                background_tasks,
                email_service.send_event_reminder,
                user.email,
                user.full_name,
                event.name,
                event.event_date,
                event.start_time,
                event.location,
                hours_until,
                event.id,
            )
            sent += 1
            notification = Notification(
                user_id=user.id,
                event_id=event.id,
                type="event_reminder",
                channel="email",
                title=f"Reminder: {event.name}",
                body=f"Starts in {hours_until}h",
                sent=None,
                sent_at=None,
            )
            db.add(notification)
        db.commit()
        logger.info("Sent %s reminders for event %s", sent, event.id)
        return sent

    async def notify_confirmation_received(
        self,
        db: Session,
        event: Event,
        participant: EventParticipant,
        status: str,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        """Notify organizer that someone confirmed/declined."""
        organizer = db.get(User, event.created_by_id)
        participant_user = db.get(User, participant.user_id)

        if not organizer or not organizer.email or not participant_user:
            return

        enqueue_email(
            background_tasks,
            email_service.send_confirmation_receipt,
            organizer.email,
            organizer.full_name,
            participant_user.full_name,
            event.name,
            status,
            event.id,
        )

        status_enum = (
            ParticipantStatus(status.upper()) if isinstance(status, str) else status
        )
        notification = Notification(
            user_id=organizer.id,
            event_id=event.id,
            type="event_confirmation",
            channel="email",
            title=f"{participant_user.full_name} {status_enum.value}",
            body=f"For event: {event.name}",
            sent=None,
            sent_at=None,
        )
        db.add(notification)
        db.commit()

        logger.info(
            f"Notified organizer about {status} from {participant_user.full_name}"
        )


# Singleton instance
notification_service = NotificationService()
