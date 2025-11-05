"""Email service for sending notifications."""
import logging
from typing import List, Optional
from datetime import datetime

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending email notifications."""
    
    def __init__(self):
        """Initialize email service with SMTP configuration."""
        self.smtp_host = settings.SMTP_HOST or "smtp.gmail.com"
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER or ""
        self.smtp_password = settings.SMTP_PASSWORD or ""
        self.from_email = settings.SMTP_FROM_EMAIL or self.smtp_user
        self.from_name = settings.SMTP_FROM_NAME or "StatCat Events"
        
        # Check if email is configured
        self.is_configured = bool(self.smtp_user and self.smtp_password)
        if not self.is_configured:
            logger.warning("Email service not configured. Set SMTP_USER and SMTP_PASSWORD in .env")
    
    async def send_event_invitation(
        self,
        to_email: str,
        to_name: str,
        event_name: str,
        event_date: str,
        event_time: Optional[str],
        event_location: Optional[str],
        event_notes: Optional[str],
        organizer_name: str,
    ) -> bool:
        """Send event invitation email."""
        if not self.is_configured:
            logger.info(f"[Email Not Configured] Would send invitation to {to_email} for event: {event_name}")
            return False
        
        subject = f"You're invited: {event_name}"
        
        time_info = f" at {event_time}" if event_time else ""
        location_info = f" • Location: {event_location}" if event_location else ""
        notes_info = f"\n\nNotes: {event_notes}" if event_notes else ""
        
        body = f"""
Hello {to_name},

You've been invited to an event:

📅 {event_name}
🗓️  {event_date}{time_info}{location_info}{notes_info}

Organized by: {organizer_name}

Please confirm your attendance in the StatCat app.

Best regards,
StatCat Team
"""
        
        return await self._send_email(to_email, subject, body)
    
    async def send_event_update(
        self,
        to_email: str,
        to_name: str,
        event_name: str,
        event_date: str,
        event_time: Optional[str],
        event_location: Optional[str],
        changes: str,
    ) -> bool:
        """Send event update notification."""
        if not self.is_configured:
            logger.info(f"[Email Not Configured] Would send update to {to_email} for event: {event_name}")
            return False
        
        subject = f"Event Updated: {event_name}"
        
        time_info = f" at {event_time}" if event_time else ""
        location_info = f" • Location: {event_location}" if event_location else ""
        
        body = f"""
Hello {to_name},

An event you're invited to has been updated:

📅 {event_name}
🗓️  {event_date}{time_info}{location_info}

What changed: {changes}

Check the StatCat app for full details.

Best regards,
StatCat Team
"""
        
        return await self._send_email(to_email, subject, body)
    
    async def send_confirmation_receipt(
        self,
        to_email: str,
        to_name: str,
        participant_name: str,
        event_name: str,
        status: str,
    ) -> bool:
        """Send confirmation receipt to organizer."""
        if not self.is_configured:
            logger.info(f"[Email Not Configured] Would send confirmation to {to_email} for participant: {participant_name}")
            return False
        
        status_emoji = {
            "confirmed": "✅",
            "declined": "❌",
            "maybe": "❓"
        }.get(status, "")
        
        subject = f"{status_emoji} {participant_name} {status} for {event_name}"
        
        body = f"""
Hello {to_name},

{participant_name} has {status} attendance for:

📅 {event_name}

View all responses in the StatCat app.

Best regards,
StatCat Team
"""
        
        return await self._send_email(to_email, subject, body)
    
    async def send_event_reminder(
        self,
        to_email: str,
        to_name: str,
        event_name: str,
        event_date: str,
        event_time: Optional[str],
        event_location: Optional[str],
        hours_until: int,
    ) -> bool:
        """Send event reminder."""
        if not self.is_configured:
            logger.info(f"[Email Not Configured] Would send reminder to {to_email} for event: {event_name}")
            return False
        
        subject = f"Reminder: {event_name} in {hours_until}h"
        
        time_info = f" at {event_time}" if event_time else ""
        location_info = f"\n📍 Location: {event_location}" if event_location else ""
        
        body = f"""
Hello {to_name},

Reminder: Your event is coming up in {hours_until} hours!

📅 {event_name}
🗓️  {event_date}{time_info}{location_info}

See you there!

Best regards,
StatCat Team
"""
        
        return await self._send_email(to_email, subject, body)
    
    async def _send_email(self, to_email: str, subject: str, body: str) -> bool:
        """Internal method to send email using SMTP."""
        try:
            # Import here to avoid dependency issues if not needed
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            msg = MIMEMultipart()
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            
            msg.attach(MIMEText(body, 'plain'))
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False


# Singleton instance
email_service = EmailService()
