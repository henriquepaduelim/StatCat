"""Email service for sending notifications."""
import logging
from typing import Optional
import httpx
import anyio

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending email notifications."""
    
    def __init__(self):
        """Initialize email service with SMTP/Resend configuration."""
        self.smtp_host = settings.SMTP_HOST or "smtp.gmail.com"
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER or ""
        self.smtp_password = settings.SMTP_PASSWORD or ""
        self.from_email = settings.SMTP_FROM_EMAIL or self.smtp_user
        self.from_name = settings.SMTP_FROM_NAME or "StatCat Sports Analytics"

        self.resend_api_key = settings.RESEND_API_KEY or None
        self.resend_from_email = settings.RESEND_FROM_EMAIL or self.from_email
        self.use_resend = bool(self.resend_api_key and self.resend_from_email)
        
        # Check if email is configured (Resend or SMTP)
        self.is_configured = self.use_resend or bool(self.smtp_user and self.smtp_password)
        if not self.is_configured:
            logger.warning("Email service not configured. Set RESEND_API_KEY or SMTP_USER/SMTP_PASSWORD in .env")
    
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
    
    async def send_password_reset(
        self,
        to_email: str,
        to_name: str,
        reset_token: str,
        expires_minutes: int,
    ) -> bool:
        """Send password reset instructions."""
        if not self.is_configured:
            logger.info(
                "[Email Not Configured] Would send password reset token to %s (expires in %s minutes)",
                to_email,
                expires_minutes,
            )
            return False
        
        subject = "Reset your StatCat password"
        body = f"""
Hello {to_name or "StatCat user"},

We received a request to reset your StatCat password.

Use the reset code below within {expires_minutes} minutes:

{reset_token}

After copying the code, open the StatCat login page and use the "Reset password" option to set a new password.

If you did not request this, you can safely ignore this email.

Best regards,
StatCat Team
"""
        return await self._send_email(to_email, subject, body)

    async def send_registration_pending(self, to_email: str, to_name: str | None = None) -> bool:
        """Notify a user their signup was received and awaits approval."""
        if not self.is_configured:
            logger.info("[Email Not Configured] Would send registration pending notice to %s", to_email)
            return False

        subject = "We received your registration"
        body = f"""
Hello {to_name or "there"},

Thanks for registering with StatCat. Your profile is under review.

We'll email you as soon as an admin approves your access.

Best regards,
StatCat Team
"""
        return await self._send_email(to_email, subject, body)

    async def send_account_approved(self, to_email: str, to_name: str | None = None) -> bool:
        """Notify user that their account was approved."""
        if not self.is_configured:
            logger.info("[Email Not Configured] Would send account approved notice to %s", to_email)
            return False

        subject = "Your StatCat account is approved"
        body = f"""
Hello {to_name or "there"},

Good news! Your StatCat account has been approved.

You can sign in now and start using the platform.

Best regards,
StatCat Team
"""
        return await self._send_email(to_email, subject, body)

    async def send_password_change_confirmation(self, to_email: str, to_name: str | None = None) -> bool:
        """Confirm to the user that their password was changed."""
        if not self.is_configured:
            logger.info("[Email Not Configured] Would send password change confirmation to %s", to_email)
            return False

        subject = "Your StatCat password was changed"
        body = f"""
Hello {to_name or "there"},

This is a confirmation that your StatCat password was just updated.

If you made this change, no action is needed. If not, please reset your password immediately.

Best regards,
StatCat Team
"""
        return await self._send_email(to_email, subject, body)

    async def send_report_ready(self, to_email: str, to_name: str | None = None) -> bool:
        """Notify an athlete that a report card is available."""
        if not self.is_configured:
            logger.info("[Email Not Configured] Would send report ready notice to %s", to_email)
            return False

        subject = "Your report card is ready"
        body = f"""
Hello {to_name or "there"},

Your report card has been approved and is now available in StatCat.

Sign in to view your feedback and next steps.

Best regards,
StatCat Team
"""
        return await self._send_email(to_email, subject, body)

    async def send_team_assignment(self, to_email: str, to_name: str | None, team_name: str) -> bool:
        """Notify a user they were added to a team."""
        if not self.is_configured:
            logger.info("[Email Not Configured] Would send team assignment notice to %s", to_email)
            return False

        subject = f"You joined team {team_name}"
        body = f"""
Hello {to_name or "there"},

You've been added to the team: {team_name}.

Sign in to view roster, events, and resources.

Best regards,
StatCat Team
"""
        return await self._send_email(to_email, subject, body)

    async def send_temp_password(self, to_email: str, to_name: str | None, password: str) -> bool:
        """Send a temporary password for first login."""
        if not self.is_configured:
            logger.info("[Email Not Configured] Would send temp password to %s", to_email)
            return False

        subject = "Your temporary StatCat password"
        body = f"""
Hello {to_name or "there"},

A StatCat account was created for you. Use the temporary password below to sign in and change it immediately:

Temporary password: {password}

After signing in, go to Settings → Change Password to set a new one.

Best regards,
StatCat Team
"""
        return await self._send_email(to_email, subject, body)

    async def send_welcome_email(self, to_email: str, to_name: str | None = None) -> bool:
        """Send welcome message on first successful login."""
        if not self.is_configured:
            logger.info("[Email Not Configured] Would send welcome email to %s", to_email)
            return False

        subject = "Welcome to StatCat"
        body = f"""
Hello {to_name or "there"},

Welcome to StatCat! Your account is ready to use.

Explore your dashboard, update your profile, and check upcoming events.

Best regards,
StatCat Team
"""
        return await self._send_email(to_email, subject, body)
    
    async def _send_email(self, to_email: str, subject: str, body: str) -> bool:
        """Internal method to send email using Resend (if configured) or SMTP."""
        # Prefer Resend if configured
        if self.use_resend:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.post(
                        "https://api.resend.com/emails",
                        headers={
                            "Authorization": f"Bearer {self.resend_api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "from": self.resend_from_email,
                            "to": [to_email],
                            "subject": subject,
                            "text": body,
                        },
                    )
                if resp.status_code < 400:
                    logger.info("Email sent successfully via Resend to %s", to_email)
                    return True
                logger.error("Failed to send email via Resend to %s: %s %s", to_email, resp.status_code, resp.text)
                # fall through to SMTP if available
            except Exception as exc:  # noqa: BLE001
                logger.error("Failed to send email via Resend to %s: %s", to_email, exc)
                # fall through to SMTP if available

        # Fallback to SMTP if configured
        if self.smtp_user and self.smtp_password:
            def _send_sync() -> bool:
                try:
                    import smtplib
                    from email.mime.text import MIMEText
                    from email.mime.multipart import MIMEMultipart

                    msg = MIMEMultipart()
                    msg["From"] = f"{self.from_name} <{self.from_email}>"
                    msg["To"] = to_email
                    msg["Subject"] = subject

                    msg.attach(MIMEText(body, "plain"))

                    with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                        server.starttls()
                        server.login(self.smtp_user, self.smtp_password)
                        server.send_message(msg)

                    logger.info("Email sent successfully via SMTP to %s", to_email)
                    return True
                except Exception as exc:
                    logger.error("Failed to send email via SMTP to %s: %s", to_email, exc)
                    return False

            return await anyio.to_thread.run_sync(_send_sync)

        logger.error("Email service not configured for sending (no Resend or SMTP).")
        return False


# Singleton instance
email_service = EmailService()
