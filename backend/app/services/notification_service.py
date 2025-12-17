"""Notification service for coordinating email and push notifications."""
import logging
from typing import List
from datetime import datetime, timezone
from sqlmodel import Session, select

from app.models.event import Event, Notification
from app.models.event_participant import EventParticipant, ParticipantStatus
from app.models.user import User
from app.services.email_service import email_service

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
                success = await email_service.send_event_invitation(
                    to_email=user.email,
                    to_name=user.full_name,
                    event_name=event.name,
                    event_date=event.event_date,
                    event_time=event.start_time,
                    event_end_date=getattr(event, "end_date", None),
                    event_end_time=getattr(event, "end_time", None),
                    event_location=event.location,
                    event_notes=event.notes,
                    organizer_name=organizer.full_name,
                    user_id=user.id,
                    event_id=event.id
                )
                
                # Log notification
                notification = Notification(
                    user_id=user_id,
                    event_id=event.id,
                    type="event_invite",
                    channel="email" if not send_push else "both",
                    title=f"You're invited: {event.name}",
                    body=f"Event on {event.event_date}" + (f" at {event.start_time}" if event.start_time else ""),
                    sent=success,
                    sent_at=datetime.now(timezone.utc) if success else None,
                )
                db.add(notification)
        
        # Mark event as notified
        event.email_sent = send_email
        event.push_sent = send_push
        db.add(event)
        db.commit()
        
        logger.info(f"Sent event invitations for event {event.id} to {len(invitee_ids)} users")
    
    async def notify_event_updated(
        self,
        db: Session,
        event: Event,
        changes: str,
        send_notification: bool = True,
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
            success = await email_service.send_event_update(
                to_email=user.email,
                to_name=user.full_name,
                event_name=event.name,
                event_date=event.event_date,
                event_time=event.start_time,
                event_location=event.location,
                changes=changes,
                event_id=event.id,
            )
            
            # Log notification
            notification = Notification(
                user_id=user.id,
                event_id=event.id,
                type="event_update",
                channel="email",
                title=f"Event Updated: {event.name}",
                body=f"Changes: {changes}",
                sent=success,
                sent_at=datetime.now(timezone.utc) if success else None,
            )
            db.add(notification)
        
        event.updated_at = datetime.now(timezone.utc)
        db.add(event)
        db.commit()
        
        logger.info(f"Sent event update for event {event.id} to {len(participants)} confirmed participants")

    async def send_event_reminders(
        self,
        db: Session,
        event: Event,
        hours_until: int = 24,
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
            success = await email_service.send_event_reminder(
                to_email=user.email,
                to_name=user.full_name,
                event_name=event.name,
                event_date=event.event_date,
                event_time=event.start_time,
                event_location=event.location,
                hours_until=hours_until,
                event_id=event.id,
            )
            if success:
                sent += 1
                notification = Notification(
                    user_id=user.id,
                    event_id=event.id,
                    type="event_reminder",
                    channel="email",
                    title=f"Reminder: {event.name}",
                    body=f"Starts in {hours_until}h",
                    sent=True,
                    sent_at=datetime.now(timezone.utc),
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
    ) -> None:
        """Notify organizer that someone confirmed/declined."""
        organizer = db.get(User, event.created_by_id)
        participant_user = db.get(User, participant.user_id)
        
        if not organizer or not organizer.email or not participant_user:
            return
        
        success = await email_service.send_confirmation_receipt(
            to_email=organizer.email,
            to_name=organizer.full_name,
            participant_name=participant_user.full_name,
            event_name=event.name,
            status=status,
            event_id=event.id,
        )
        
        # Log notification
        status_enum = ParticipantStatus(status.upper()) if isinstance(status, str) else status
        notification = Notification(
            user_id=organizer.id,
            event_id=event.id,
            type="event_confirmation",
            channel="email",
            title=f"{participant_user.full_name} {status_enum.value}",
            body=f"For event: {event.name}",
            sent=success,
            sent_at=datetime.now(timezone.utc) if success else None,
        )
        db.add(notification)
        db.commit()
        
        logger.info(f"Notified organizer about {status} from {participant_user.full_name}")


# Singleton instance
notification_service = NotificationService()
