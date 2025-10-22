from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import httpx
from sqlmodel import Session, select

from app.core.config import settings
from app.models.calendar_event import CalendarEvent, CalendarEventAttendee
from app.models.google_credential import GoogleCredential


class GoogleOAuthError(RuntimeError):
    pass


class GoogleAPIError(RuntimeError):
    pass


def build_authorization_url(state: str, scopes: list[str]) -> str:
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_REDIRECT_URI:
        raise GoogleOAuthError("Google client configuration is missing")

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "scope": " ".join(scopes),
        "state": state,
    }

    query = httpx.QueryParams(params)
    return f"https://accounts.google.com/o/oauth2/auth?{query}"  # noqa: E501


def exchange_code_for_tokens(code: str) -> dict[str, Any]:
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET or not settings.GOOGLE_REDIRECT_URI:
        raise GoogleOAuthError("Google client configuration is missing")

    token_endpoint = "https://oauth2.googleapis.com/token"
    payload = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    response = httpx.post(token_endpoint, data=payload, timeout=30)
    if response.status_code >= 400:
        raise GoogleOAuthError(f"Failed to exchange code: {response.text}")

    data = response.json()
    expires_in = data.get("expires_in")
    expires_at = datetime.utcnow() + timedelta(seconds=expires_in) if expires_in else None
    return {
        "access_token": data.get("access_token"),
        "refresh_token": data.get("refresh_token"),
        "token_type": data.get("token_type"),
        "expires_at": expires_at,
        "scope": data.get("scope"),
        "id_token": data.get("id_token"),
    }


def _refresh_access_token(session: Session, credential: GoogleCredential) -> str:
    if not credential.refresh_token:
        raise GoogleAPIError("Missing refresh token; reconnect Google account")
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise GoogleAPIError("Google client configuration is missing")

    payload = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "refresh_token": credential.refresh_token,
        "grant_type": "refresh_token",
    }

    response = httpx.post("https://oauth2.googleapis.com/token", data=payload, timeout=30)
    if response.status_code >= 400:
        raise GoogleAPIError(f"Failed to refresh Google token: {response.text}")

    data = response.json()
    credential.access_token = data.get("access_token", credential.access_token)
    credential.token_type = data.get("token_type", credential.token_type)
    expires_in = data.get("expires_in")
    credential.expires_at = (
        datetime.utcnow() + timedelta(seconds=expires_in)
        if expires_in
        else credential.expires_at
    )
    credential.synced_at = datetime.utcnow()
    session.add(credential)
    session.commit()
    session.refresh(credential)
    return credential.access_token


def _get_access_token(session: Session, credential: GoogleCredential) -> str:
    if not credential.access_token:
        return _refresh_access_token(session, credential)
    if credential.expires_at and credential.expires_at <= datetime.utcnow() + timedelta(seconds=60):
        return _refresh_access_token(session, credential)
    return credential.access_token


def _build_event_payload(event: CalendarEvent, attendees: list[CalendarEventAttendee]) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "summary": event.summary,
        "start": {
            "dateTime": event.start_at.isoformat(),
            "timeZone": event.time_zone,
        },
        "end": {
            "dateTime": event.end_at.isoformat(),
            "timeZone": event.time_zone,
        },
    }

    if event.description:
        payload["description"] = event.description
    if event.location:
        payload["location"] = event.location

    if attendees:
        payload["attendees"] = [
            {
                "email": attendee.email,
                "displayName": attendee.display_name,
            }
            for attendee in attendees
        ]

    return payload


def create_calendar_event(
    session: Session,
    credential: GoogleCredential,
    event: CalendarEvent,
    attendees: list[CalendarEventAttendee],
) -> dict[str, Any]:
    access_token = _get_access_token(session, credential)
    calendar_id = event.calendar_id or credential.calendar_id or "primary"
    url = f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    params = {"sendUpdates": "all"}
    payload = _build_event_payload(event, attendees)

    response = httpx.post(url, headers=headers, json=payload, params=params, timeout=30)
    if response.status_code >= 400:
        raise GoogleAPIError(response.text)
    return response.json()


def update_calendar_event(
    session: Session,
    credential: GoogleCredential,
    event: CalendarEvent,
    attendees: list[CalendarEventAttendee],
) -> dict[str, Any]:
    if not event.google_event_id:
        return create_calendar_event(session, credential, event, attendees)

    access_token = _get_access_token(session, credential)
    calendar_id = event.calendar_id or credential.calendar_id or "primary"
    url = (
        f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{event.google_event_id}"
    )
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    params = {"sendUpdates": "all"}
    payload = _build_event_payload(event, attendees)

    response = httpx.patch(url, headers=headers, json=payload, params=params, timeout=30)
    if response.status_code >= 400:
        raise GoogleAPIError(response.text)
    return response.json()


def delete_calendar_event(
    session: Session,
    credential: GoogleCredential,
    event: CalendarEvent,
) -> None:
    if not event.google_event_id:
        return
    access_token = _get_access_token(session, credential)
    calendar_id = event.calendar_id or credential.calendar_id or "primary"
    url = (
        f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{event.google_event_id}"
    )
    headers = {
        "Authorization": f"Bearer {access_token}",
    }
    params = {"sendUpdates": "all"}

    response = httpx.delete(url, headers=headers, params=params, timeout=30)
    if response.status_code >= 400 and response.status_code != 410:
        raise GoogleAPIError(response.text)


GOOGLE_TO_LOCAL_STATUS = {
    "accepted": "accepted",
    "declined": "declined",
    "tentative": "tentative",
    "needsAction": "pending",
}


def sync_event_attendees_from_google(
    session: Session,
    credential: GoogleCredential,
    event: CalendarEvent,
) -> int:
    if not event.google_event_id:
        return 0

    access_token = _get_access_token(session, credential)
    calendar_id = event.calendar_id or credential.calendar_id or "primary"
    url = (
        f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{event.google_event_id}"
    )
    headers = {
        "Authorization": f"Bearer {access_token}",
    }
    response = httpx.get(url, headers=headers, params={"maxAttendees": 250}, timeout=30)
    if response.status_code == 404:
        return 0
    if response.status_code >= 400:
        raise GoogleAPIError(response.text)

    payload = response.json()
    google_attendees = payload.get("attendees", [])
    if payload.get("status") == "cancelled":
        event.status = "cancelled"

    local_attendees = session.exec(
        select(CalendarEventAttendee).where(CalendarEventAttendee.event_id == event.id)
    ).all()
    updated = 0
    email_to_local = {attendee.email.lower(): attendee for attendee in local_attendees}

    for entry in google_attendees:
        email = (entry.get("email") or "").lower()
        if not email or email not in email_to_local:
            continue
        new_status = GOOGLE_TO_LOCAL_STATUS.get(entry.get("responseStatus"), "pending")
        attendee = email_to_local[email]
        if attendee.status != new_status:
            attendee.status = new_status
            attendee.response_at = datetime.utcnow() if new_status != "pending" else None
            attendee.response_source = "google"
            session.add(attendee)
            updated += 1

    event.selection_metadata = event.selection_metadata or {}
    event.selection_metadata["last_google_sync_at"] = datetime.utcnow().isoformat()
    session.add(event)
    session.commit()
    return updated


def sync_all_google_events(session: Session) -> dict[str, int]:
    credentials = session.exec(select(GoogleCredential)).all()
    stats = {"credentials": len(credentials), "events_synced": 0, "attendees_updated": 0}

    for credential in credentials:
        if not credential.user_id:
            continue
        events = session.exec(
            select(CalendarEvent)
            .where(CalendarEvent.created_by_id == credential.user_id)
            .where(CalendarEvent.google_event_id.is_not(None))
        ).all()
        for event in events:
            stats["events_synced"] += 1
            try:
                updated = sync_event_attendees_from_google(session, credential, event)
                stats["attendees_updated"] += updated
            except GoogleAPIError:
                continue

    return stats
