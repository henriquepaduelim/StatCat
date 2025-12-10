"Email service for sending professional, feature-rich notifications."
import base64
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote

import anyio
import httpx

from app.core.config import settings
from app.core.security_token import security_token_manager

# Attempt to import ics, but allow the app to run without it.
try:
    from ics import Calendar, Event
except ImportError:
    Calendar = None
    Event = None

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending email notifications with HTML, deep links, and calendar invites."""

    def __init__(self):
        """Initialize email service with SMTP/Resend configuration."""
        self.smtp_host = settings.SMTP_HOST or "smtp.gmail.com"
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER or ""
        self.smtp_password = settings.SMTP_PASSWORD or ""
        self.from_email = settings.SMTP_FROM_EMAIL or self.smtp_user
        self.from_name = settings.SMTP_FROM_NAME or "StatCat"

        self.resend_api_key = settings.RESEND_API_KEY or None
        self.resend_from_email = settings.RESEND_FROM_EMAIL or self.from_email
        self.use_resend = bool(self.resend_api_key and self.resend_from_email)

        raw_frontend = settings.FRONTEND_URL
        self.frontend_url = raw_frontend.rstrip("/") if raw_frontend else "http://localhost:3000"
        self.api_url = f"{self.frontend_url}/api/v1"

        self.is_configured = self.use_resend or bool(self.smtp_user and self.smtp_password)
        if not self.is_configured:
            logger.warning("Email service not configured. Set RESEND_API_KEY or SMTP_USER/SMTP_PASSWORD in .env")
        if not Calendar:
            logger.warning("`ics` library not installed. Calendar invite features will be disabled. Run `pip install ics`.")

    def _generate_html_body(self, greeting: str, content: str, buttons: List[Dict[str, str]] = None) -> str:
        """Generates a professional HTML email body with multiple buttons."""
        buttons_html = ""
        if buttons:
            parts: list[str] = ['<div style="margin-top: 20px;">']
            for button in buttons:
                style = (
                    "display: inline-block; padding: 12px 20px; margin: 5px; "
                    "font-family: sans-serif; font-size: 15px; color: #ffffff; "
                    "text-decoration: none; border-radius: 5px; "
                    f"background-color: {button.get('color', '#007bff')}"
                )
                url = button.get("url", "#")
                text = button.get("text", "Open")
                parts.append(f'<a href="{url}" target="_blank" style="{style}">{text}</a>')
            parts.append("</div>")
            buttons_html = "".join(parts)
            
        return (
            '<div style="font-family: sans-serif; color: #333; line-height: 1.6;">'
            f"<p>{greeting}</p>{content}{buttons_html}"
            '<p style="margin-top: 30px; font-size: 14px; color: #777;">'
            "Best regards,<br>The StatCat Team</p></div>"
        )

    def _parse_datetime(self, date_str: Optional[str], time_str: Optional[str]) -> Optional[datetime]:
        if not date_str: return None
        time_part = time_str or "00:00"
        try:
            # Create a naive datetime object first, assuming ISO format for date and HH:MM for time
            dt_naive = datetime.fromisoformat(f"{date_str}T{time_part}")
            # Then localize it to the system's timezone and convert to UTC
            dt_aware = dt_naive.astimezone()
            return dt_aware.astimezone(timezone.utc)
        except (ValueError, TypeError):
            logger.error(f"Could not parse date/time: {date_str} {time_str}")
            return None

    def _create_calendar_invite(self, event_name: str, start_utc: datetime, end_utc: datetime, event_location: Optional[str], event_url: Optional[str]) -> Tuple[Optional[str], Optional[Dict[str, str]]]:
        if not Calendar or not Event: return None, None
        description = (
            f"For more details, visit: {event_url}"
            if event_url else f"View the event in the {self.from_name} app."
        )
        cal = Calendar()
        event = Event(name=event_name, begin=start_utc, end=end_utc, description=description)
        if event_location: event.location = event_location
        cal.events.add(event)
        ics_content = cal.serialize()
        google_start, google_end = (
            start_utc.strftime('%Y%m%dT%H%M%SZ'), end_utc.strftime('%Y%m%dT%H%M%SZ')
        )
        links = {
            "google": (
                f"https://calendar.google.com/calendar/render?action=TEMPLATE&text={quote(event_name)}"
                f"&dates={google_start}/{google_end}&details={quote(description)}"
                f"&location={quote(event_location or '')}"
            )
        }
        return ics_content, links

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
        user_id: Optional[int] = None,
        event_id: Optional[int] = None,
        event_end_date: Optional[str] = None,
        event_end_time: Optional[str] = None
    ) -> bool:
        if not self.is_configured: return False
        
        subject = f"Invitation: {event_name}"
        event_url = f"{self.frontend_url}/events/{event_id}" if event_id else self.frontend_url
        
        # Build text body with conditional RSVP links
        text_body_rsvp_links = ""
        if user_id and event_id:
            rsvp_salt = 'rsvp-event'
            confirm_token = security_token_manager.generate_token(
                {'user_id': user_id, 'event_id': event_id, 'status': 'confirmed'}, salt=rsvp_salt
            )
            decline_token = security_token_manager.generate_token(
                {'user_id': user_id, 'event_id': event_id, 'status': 'declined'}, salt=rsvp_salt
            )
            text_body_rsvp_links = (
                f"\nOne-Click RSVP:\n"
                f"- I'll be there: {self.api_url}/events/rsvp?token={confirm_token}\n"
                f"- I can't make it: {self.api_url}/events/rsvp?token={decline_token}\n"
            )

        text_body = (
            f"Hello {to_name or 'there'},\n\n"
            f"You have been invited to the event \"{event_name}\" by {organizer_name} on {event_date}"
            f"{f' at {event_time}' if event_time else ''}."
            f"{f' Location: {event_location}.' if event_location else ''}\n"
            f"{f'Notes: {event_notes}\\n' if event_notes else ''}\n"
            f"{'View details: ' + event_url if event_url else ''}"
            f"{text_body_rsvp_links}"
        )
        content_html = (
            f'<p>You have been invited to an event by <strong>{organizer_name}</strong>.</p>'
            f'<div style="background-color:#f8f9fa; padding: 15px; border-radius: 5px; margin-top: 15px;">'
            f'<h3 style="margin-top: 0;">{event_name}</h3>'
            f'<p><strong>Date:</strong> {event_date} at {event_time}</p>'
            f'{f"<p><strong>Location:</strong> {event_location}</p>" if event_location else ""}'
            f'{f"<p><strong>Notes:</strong> {event_notes}</p>" if event_notes else ""}</div>'
        )

        buttons = []
        if user_id and event_id:
            rsvp_salt = 'rsvp-event'
            confirm_token = security_token_manager.generate_token(
                {'user_id': user_id, 'event_id': event_id, 'status': 'confirmed'}, salt=rsvp_salt
            )
            decline_token = security_token_manager.generate_token(
                {'user_id': user_id, 'event_id': event_id, 'status': 'declined'}, salt=rsvp_salt
            )
            buttons.extend([
                {"text": "✔ Yes, I'll be there", "url": f"{self.api_url}/events/rsvp?token={confirm_token}", "color": "#28a745"},
                {"text": "✖ No, I can't make it", "url": f"{self.api_url}/events/rsvp?token={decline_token}", "color": "#dc3545"}
            ])
        
        buttons.append({"text": "View Event Details", "url": event_url, "color": "#6c757d"})
        
        start_utc = self._parse_datetime(event_date, event_time)
        end_utc = self._parse_datetime(event_end_date, event_end_time) or (start_utc + timedelta(hours=1) if start_utc else None)
        ics_content, calendar_links = (
            self._create_calendar_invite(event_name, start_utc, end_utc, event_location, event_url)
            if start_utc and end_utc else (None, None)
        )
        if calendar_links:
            content_html += (
                f'<p style="margin-top: 20px;"><strong>Add to Calendar:</strong> '
                f'<a href="{calendar_links["google"]}" target="_blank">Google Calendar</a></p>'
            )
        
        html_body = self._generate_html_body(f"Hello {to_name}, ", content_html, buttons)
        attachments = [
            {"filename": "invite.ics", "content": base64.b64encode(ics_content.encode("utf-8")).decode("utf-8"), 
             "content_id": "event.ics", "mime_type": "text/calendar"}
        ] if ics_content else []

        return await self._send_email(to_email, subject, text_body, html_body, attachments)

    async def send_event_update(
        self,
        to_email: str,
        to_name: str,
        event_name: str,
        changes: str,
        event_date: str,
        event_time: Optional[str],
        event_location: Optional[str],
        event_end_date: Optional[str] = None,
        event_end_time: Optional[str] = None,
        event_id: Optional[int] = None
    ) -> bool:
        if not self.is_configured: return False
        subject = f"Event Updated: {event_name}"
        event_url = f"{self.frontend_url}/events/{event_id}" if event_id else self.frontend_url
        
        text_body = (
            f"Hello {to_name or 'there'},\n\n"
            f"The event \"{event_name}\" has been updated.\n"
            f"Changes: {changes}\n"
            f"Date: {event_date} at {event_time}\n"
            f"{f'Location: {event_location}\\n' if event_location else ''}"
            f"{'View details: ' + event_url if event_url else ''}"
        )
        content_html = (
            f"<p>An event you are attending, <strong>{event_name}</strong>, has been updated.</p>"
            f"<p><strong>Changes:</strong> {changes}</p>"
        )
        
        start_utc = self._parse_datetime(event_date, event_time)
        end_utc = self._parse_datetime(event_end_date, event_end_time) or (start_utc + timedelta(hours=1) if start_utc else None)
        ics_content, calendar_links = (
            self._create_calendar_invite(event_name, start_utc, end_utc, event_location, event_url)
            if start_utc and end_utc else (None, None)
        )
        if calendar_links:
            content_html += (
                f'<p style="margin-top: 20px;"><strong>Update your Calendar:</strong> '
                f'<a href="{calendar_links["google"]}" target="_blank">Google Calendar</a></p>'
            )
        
        html_body = self._generate_html_body(
            f"Hello {to_name},",
            content_html,
            [{"text": "View Event", "url": event_url}]
        )
        attachments = [
            {"filename": "invite.ics", "content": base64.b64encode(ics_content.encode("utf-8")).decode("utf-8"), 
             "content_id": "event.ics", "mime_type": "text/calendar"}
        ] if ics_content else []

        return await self._send_email(to_email, subject, text_body, html_body, attachments)

    async def send_confirmation_receipt(self, to_email: str, to_name: str, participant_name: str, event_name: str, status: str, event_id: Optional[int] = None) -> bool:
        if not self.is_configured: return False
        subject = f"RSVP Update for {event_name}"
        event_url = f"{self.frontend_url}/events/{event_id}" if event_id else self.frontend_url
        text_body = (
            f"Hello {to_name or 'there'},\n\n"
            f"This is a confirmation that {participant_name} responded "
            f"as {status.upper()} for the event \"{event_name}\".\n\n"
            f"{'View responses: ' + event_url if event_url else ''}"
        )
        content_html = (
            f"<p>This is a confirmation that <strong>{participant_name}</strong> has responded "
            f"as <strong>{status.upper()}</strong> for the event: <strong>{event_name}</strong>.</p>"
        )
        html_body = self._generate_html_body(
            f"Hello {to_name},",
            content_html,
            [{"text": "View All Responses", "url": event_url}]
        )
        return await self._send_email(to_email, subject, text_body, html_body)

    async def send_event_reminder(
        self,
        to_email: str,
        to_name: str,
        event_name: str,
        event_date: str,
        event_time: Optional[str],
        event_location: Optional[str],
        hours_until: int,
        event_end_date: Optional[str] = None,
        event_end_time: Optional[str] = None,
        event_id: Optional[int] = None
    ) -> bool:
        if not self.is_configured: return False
        subject = f"Reminder: {event_name} in {hours_until} hours"
        event_url = f"{self.frontend_url}/events/{event_id}" if event_id else self.frontend_url
        text_body = (
            f"Hello {to_name or 'there'},\n\n"
            f"This is a reminder that the event \"{event_name}\" starts in {hours_until} hours.\n"
            f"Date: {event_date} at {event_time}\n"
            f"{f'Location: {event_location}\\n' if event_location else ''}"
            f"{'View details: ' + event_url if event_url else ''}"
        )
        content_html = (
            f"<p>This is a friendly reminder that the event <strong>{event_name}</strong> "
            f"is scheduled to start in <strong>{hours_until} hours</strong>.</p>"
            f"<p><strong>Date:</strong> {event_date} at {event_time}<br>"
            f"{f'<strong>Location:</strong> {event_location}' if event_location else ''}</p>"
        )
        
        start_utc = self._parse_datetime(event_date, event_time)
        end_utc = self._parse_datetime(event_end_date, event_end_time) or (start_utc + timedelta(hours=1) if start_utc else None)
        ics_content, calendar_links = (
            self._create_calendar_invite(event_name, start_utc, end_utc, event_location, event_url)
            if start_utc and end_utc else (None, None)
        )
        if calendar_links:
            content_html += (
                f"<p style=\"margin-top: 20px;\"><strong>Add to Calendar:</strong> "
                f"<a href=\"{calendar_links['google']}\" target=\"_blank\">Google Calendar</a></p>"
            )
        
        html_body = self._generate_html_body(
            f"Hello {to_name},",
            content_html,
            [{"text": "View Event Details", "url": event_url}]
        )
        attachments = [
            {"filename": "invite.ics", "content": base64.b64encode(ics_content.encode("utf-8")).decode("utf-8"), 
             "content_id": "event.ics", "mime_type": "text/calendar"}
        ] if ics_content else []

        return await self._send_email(to_email, subject, text_body, html_body, attachments)

    async def send_password_reset(self, to_email: str, to_name: str, reset_token: str, expires_minutes: int) -> bool:
        if not self.is_configured: return False
        subject = "Reset Your StatCat Password"
        reset_url = f"{self.frontend_url}/reset-password?token={reset_token}"
        text_body = (
            f"Hello {to_name or 'there'},\n\n"
            f"We received a request to reset your password. Please use the link below "
            f"within {expires_minutes} minutes to set a new one. "
            f"If you did not request this, please ignore this email.\n\n"
            f"Reset link: {reset_url}\n\n"
            f"Best regards,\nThe {self.from_name} Team"
        )
        content_html = (
            f"<p>We received a request to reset your password. "
            f"If you did not make this request, please ignore this email.</p>"
            f"<p>Click the button below within <strong>{expires_minutes} minutes</strong> to set a new password.</p>"
        )
        html_body = self._generate_html_body(
            f"Hello {to_name or 'there'},",
            content_html,
            [{"text": "Reset Your Password", "url": reset_url}]
        )
        return await self._send_email(to_email, subject, text_body, html_body)

    async def send_registration_pending(self, to_email: str, to_name: Optional[str] = None) -> bool:
        if not self.is_configured: return False
        subject = "We've Received Your StatCat Registration"
        text_body = (
            f"Hello {to_name or 'there'},\n\n"
            f"Thanks for registering with {self.from_name}. "
            f"Your profile is currently under review by an administrator. "
            f"We'll notify you by email as soon as your account is approved.\n\n"
            f"Best regards,\nThe {self.from_name} Team"
        )
        content_html = (
            f"<p>Thanks for registering with {self.from_name}. "
            f"Your profile is currently under review by an administrator. "
            f"We'll notify you by email as soon as your account is approved.</p>"
        )
        html_body = self._generate_html_body(f"Hello {to_name or 'there'},", content_html)
        return await self._send_email(to_email, subject, text_body, html_body)

    async def send_account_approved(self, to_email: str, to_name: Optional[str] = None) -> bool:
        if not self.is_configured: return False
        subject = f"Welcome to {self.from_name}! Your Account is Approved"
        login_url = f"{self.frontend_url}/login"
        text_body = (
            f"Hello {to_name or 'there'},\n\n"
            f"Good news! Your account has been approved by an administrator. "
            f"You can now sign in and start using the platform.\n\n"
            f"Best regards,\nThe {self.from_name} Team"
        )
        content_html = (
            f"<p>Good news! Your account has been approved by an administrator. "
            f"You can now sign in and start using the platform.</p>"
        )
        html_body = self._generate_html_body(
            f"Hello {to_name or 'there'},",
            content_html,
            [{"text": "Sign In to Your Account", "url": login_url}]
        )
        return await self._send_email(to_email, subject, text_body, html_body)

    async def send_password_change_confirmation(self, to_email: str, to_name: Optional[str] = None) -> bool:
        if not self.is_configured: return False
        subject = f"Your {self.from_name} Password Was Changed"
        text_body = (
            f"Hello {to_name or 'there'},\n\n"
            f"This is a confirmation that your {self.from_name} password was just updated. "
            f"If you did not authorize this change, please reset your password immediately and contact support.\n\n"
            f"Best regards,\nThe {self.from_name} Team"
        )
        content_html = (
            f"<p>This is a confirmation that your StatCat password was just updated. "
            f"If you made this change, no action is needed. "
            f"If you did not authorize this change, "
            f"please reset your password immediately and contact support.</p>"
        )
        html_body = self._generate_html_body(
            f"Hello {to_name or 'there'},",
            content_html,
            [{"text": "Reset Password", "url": f"{self.frontend_url}/login"}]
        )
        return await self._send_email(to_email, subject, text_body, html_body)

    async def send_report_ready(self, to_email: str, to_name: Optional[str] = None, athlete_id: Optional[int] = None) -> bool:
        if not self.is_configured: return False
        subject = "Your Performance Report is Ready"
        report_url = f"{self.frontend_url}/athlete/{athlete_id}/reports" if athlete_id else self.frontend_url
        text_body = (
            f"Hello {to_name or 'there'},\n\n"
            f"Your latest performance report has been approved and is now available in {self.from_name}. "
            f"Sign in to view your feedback and next steps.\n\n"
            f"Best regards,\nThe {self.from_name} Team"
        )
        content_html = (
            f"<p>Your latest performance report has been approved and is now available in {self.from_name}. "
            f"Sign in to view your feedback and next steps.</p>"
        )
        html_body = self._generate_html_body(
            f"Hello {to_name or 'there'},",
            content_html,
            [{"text": "View Your Report", "url": report_url}]
        )
        return await self._send_email(to_email, subject, text_body, html_body)

    async def send_team_assignment(self, to_email: str, to_name: Optional[str], team_name: str, team_id: Optional[int] = None) -> bool:
        if not self.is_configured: return False
        subject = f"You Have Joined Team {team_name}"
        team_url = f"{self.frontend_url}/teams/{team_id}" if team_id else self.frontend_url
        text_body = (
            f"Hello {to_name or 'there'},\n\n"
            f"You've been added to the team \"{team_name}\". "
            f"Sign in to view the roster, events, and other resources.\n\n"
            f"Best regards,\nThe {self.from_name} Team"
        )
        content_html = (
            f"<p>You've been added to the team: <strong>{team_name}</strong>. "
            f"Sign in to view the roster, events, and other resources.</p>"
        )
        html_body = self._generate_html_body(
            f"Hello {to_name or 'there'},",
            content_html,
            [{"text": "View Your Team", "url": team_url}]
        )
        return await self._send_email(to_email, subject, text_body, html_body)

    async def send_temp_password(self, to_email: str, to_name: Optional[str], password: str) -> bool:
        if not self.is_configured: return False
        subject = f"Your Temporary {self.from_name} Password"
        login_url = f"{self.frontend_url}/login"
        text_body = (
            f"Hello {to_name or 'there'},\n\n"
            f"A {self.from_name} account was created for you. "
            f"Use the temporary password below to sign in, and you'll be prompted to set a new one.\n\n"
            f"Temporary password: {password}\n\n"
            f"Sign in: {login_url}\n\n"
            f"Best regards,\nThe {self.from_name} Team"
        )
        content_html = (
            f"<p>A {self.from_name} account was created for you. "
            f"Use the temporary password below to sign in, at which point you will "
            f"be required to set a new one.</p>"
            f"<p style='font-size: 18px; font-weight: bold; margin: 20px 0;'>{password}</p>"
        )
        html_body = self._generate_html_body(
            f"Hello {to_name or 'there'},",
            content_html,
            [{"text": "Sign In", "url": login_url}]
        )
        return await self._send_email(to_email, subject, text_body, html_body)

    async def _send_email(self, to_email: str, subject: str, text_body: str, html_body: Optional[str] = None, attachments: Optional[List[Dict[str, Any]]] = None) -> bool:
        if not self.is_configured:
            logger.error("Email service not configured for sending.")
            return False
        # If Resend is configured, try to use it first
        if self.use_resend:
            try:
                json_payload = {
                    "from": f"{self.from_name} <{self.resend_from_email}>",
                    "to": [to_email],
                    "subject": subject,
                    "text": text_body,
                    "html": html_body,
                    "attachments": attachments or []
                }
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.post(
                        "https://api.resend.com/emails",
                        headers={"Authorization": f"Bearer {self.resend_api_key}"},
                        json=json_payload,
                    )
                if resp.status_code < 400:
                    logger.info("Email sent successfully via Resend to %s", to_email)
                    return True
                logger.error(
                    "Failed to send email via Resend to %s: %s %s",
                    to_email, resp.status_code, resp.text
                )
                # Fall through to SMTP if Resend fails
            except Exception as exc:
                logger.error("Failed to send email via Resend to %s: %s", to_email, exc)
                # Fall through to SMTP if Resend fails

        # Fallback to SMTP if configured or Resend failed
        if self.smtp_user and self.smtp_password:
            def _send_sync() -> bool:
                try:
                    import smtplib
                    from email.mime.multipart import MIMEMultipart
                    from email.mime.text import MIMEText
                    from email.mime.application import MIMEApplication # Needed for non-text attachments
                    
                    msg_root = MIMEMultipart('related')
                    msg_root["From"] = f"{self.from_name} <{self.from_email}>"
                    msg_root["To"] = to_email
                    msg_root["Subject"] = subject
                    
                    msg_alt = MIMEMultipart('alternative')
                    msg_alt.attach(MIMEText(text_body, "plain", "utf-8"))
                    if html_body: msg_alt.attach(MIMEText(html_body, "html", "utf-8"))
                    msg_root.attach(msg_alt)

                    if attachments:
                        for attachment in attachments:
                            _mime_type = attachment.get("mime_type", "application/octet-stream")
                            
                            if _mime_type.startswith("text/"):
                                part = MIMEText(
                                    base64.b64decode(attachment["content"]).decode("utf-8"),
                                    _subtype=_mime_type.split('/', 1)[1],
                                    _charset="utf-8"
                                )
                            else:
                                part = MIMEApplication(
                                    base64.b64decode(attachment["content"]),
                                    _subtype=_mime_type.split('/', 1)[1] if "/" in _mime_type else "octet-stream"
                                )
                            
                            part.add_header('Content-Disposition', f'attachment; filename="{attachment["filename"]}"')
                            if attachment.get("content_id"):
                                 part.add_header('Content-ID', f'<{attachment["content_id"]}>')
                            msg_root.attach(part)

                    with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                        if self.smtp_port == 587: server.starttls()
                        server.login(self.smtp_user, self.smtp_password)
                        server.send_message(msg_root)
                    logger.info("Email sent successfully via SMTP to %s", to_email)
                    return True
                except Exception as exc:
                    logger.error("Failed to send email via SMTP to %s: %s", to_email, exc)
                    return False
            return await anyio.to_thread.run_sync(_send_sync)
        logger.error("Email service not configured for sending (no Resend or SMTP).")
        return False

email_service = EmailService()
