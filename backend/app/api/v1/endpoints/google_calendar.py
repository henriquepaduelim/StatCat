from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import get_current_active_user
from app.core.config import settings
from app.db.session import get_session
from app.models.google_credential import GoogleCredential
from app.models.user import User
from app.schemas.google import GoogleCredentialCreate, GoogleCredentialRead
from app.services.google_calendar import GoogleOAuthError, build_authorization_url, exchange_code_for_tokens

router = APIRouter()


def _resolve_client_id(current_user: User, requested_client_id: int | None) -> int | None:
    if current_user.role == "club":
        return current_user.client_id
    return requested_client_id or current_user.client_id


def _serialize_credential(credential: GoogleCredential) -> GoogleCredentialRead:
    return GoogleCredentialRead(
        id=credential.id,
        user_id=credential.user_id,
        client_id=credential.client_id,
        account_email=credential.account_email,
        calendar_id=credential.calendar_id,
        expires_at=credential.expires_at,
        scope=credential.scope,
        synced_at=credential.synced_at,
        created_at=credential.created_at,
        updated_at=credential.updated_at,
    )


@router.get("/authorize", response_model=dict[str, str])
def initiate_google_authorization(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
    client_id: int | None = None,
) -> dict[str, str]:
    resolved_client_id = _resolve_client_id(current_user, client_id)
    if current_user.role == "club" and resolved_client_id != current_user.client_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    state_payload = {
        "user_id": current_user.id,
        "client_id": resolved_client_id,
    }
    token = session.exec(select(GoogleCredential).where(GoogleCredential.user_id == current_user.id)).first()
    if token is None:
        state_payload["mode"] = "create"
    else:
        state_payload["mode"] = "update"

    # Serialize state simple (avoid signing for now; expect base64/str in front)
    state = "|".join(
        [
            f"user_id:{state_payload['user_id']}",
            f"client_id:{state_payload['client_id'] or ''}",
            f"mode:{state_payload['mode']}",
        ]
    )

    try:
        url = build_authorization_url(state=state, scopes=settings.GOOGLE_OAUTH_SCOPES)
    except GoogleOAuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return {"authorization_url": url}


@router.get("/me", response_model=GoogleCredentialRead | None)
def get_my_google_credential(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> GoogleCredentialRead | None:
    statement = select(GoogleCredential).where(GoogleCredential.user_id == current_user.id)
    credential = session.exec(statement).first()
    if credential is None:
        return None
    return _serialize_credential(credential)


@router.post("/me", response_model=GoogleCredentialRead, status_code=status.HTTP_201_CREATED)
def upsert_google_credential(
    payload: GoogleCredentialCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> GoogleCredentialRead:
    resolved_client_id = _resolve_client_id(current_user, current_user.client_id)

    statement = select(GoogleCredential).where(GoogleCredential.user_id == current_user.id)
    credential = session.exec(statement).first()

    if credential is None:
        credential = GoogleCredential(
            user_id=current_user.id,
            client_id=resolved_client_id,
            account_email=payload.account_email,
            google_user_id=payload.google_user_id,
            calendar_id=payload.calendar_id or "primary",
            access_token=payload.access_token,
            refresh_token=payload.refresh_token,
            token_type=payload.token_type,
            expires_at=payload.expires_at,
            scope=payload.scope,
            synced_at=datetime.utcnow(),
        )
        session.add(credential)
        session.commit()
        session.refresh(credential)
        return _serialize_credential(credential)

    credential.account_email = payload.account_email
    credential.google_user_id = payload.google_user_id
    credential.calendar_id = payload.calendar_id or credential.calendar_id or "primary"
    credential.access_token = payload.access_token
    credential.refresh_token = payload.refresh_token
    credential.token_type = payload.token_type
    credential.expires_at = payload.expires_at
    credential.scope = payload.scope
    credential.synced_at = datetime.utcnow()
    session.add(credential)
    session.commit()
    session.refresh(credential)
    return _serialize_credential(credential)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_google_credential(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> None:
    statement = select(GoogleCredential).where(GoogleCredential.user_id == current_user.id)
    credential = session.exec(statement).first()
    if credential is None:
        return None
    session.delete(credential)
    session.commit()


def _resolve_user(session: Session, user_id: int) -> User:
    user = session.exec(select(User).where(User.id == user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user state")
    return user


def _parse_state(state: str) -> tuple[int, int | None]:
    components = dict(part.split(":", 1) for part in state.split("|") if ":" in part)
    state_user_raw = components.get("user_id")
    if not state_user_raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="State missing user")
    try:
        user_id = int(state_user_raw)
    except ValueError as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user state") from exc

    state_client_id_raw = components.get("client_id")
    try:
        client_id = int(state_client_id_raw) if state_client_id_raw else None
    except ValueError as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid client state") from exc
    return user_id, client_id


@router.api_route("/callback", methods=["GET", "POST"], response_model=GoogleCredentialRead)
def complete_google_authorization(
    code: str,
    state: str,
    session: Session = Depends(get_session),
) -> GoogleCredentialRead:
    state_user_id, state_client_id = _parse_state(state)
    user = _resolve_user(session, state_user_id)
    resolved_client_id = _resolve_client_id(user, state_client_id)

    try:
        token_payload = exchange_code_for_tokens(code)
    except GoogleOAuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if not token_payload.get("access_token") or not token_payload.get("refresh_token"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google did not return access or refresh token",
        )

    id_token = token_payload.get("id_token")
    account_email = user.email
    google_user_id = None
    if id_token:
        account_email = user.email
        google_user_id = None

    payload = GoogleCredentialCreate(
        access_token=token_payload["access_token"],
        refresh_token=token_payload["refresh_token"],
        token_type=token_payload.get("token_type"),
        expires_at=token_payload.get("expires_at"),
        scope=token_payload.get("scope"),
        calendar_id="primary",
        account_email=account_email,
        google_user_id=google_user_id,
    )

    statement = select(GoogleCredential).where(GoogleCredential.user_id == user.id)
    credential = session.exec(statement).first()

    if credential is None:
        credential = GoogleCredential(
            user_id=user.id,
            client_id=resolved_client_id,
            account_email=payload.account_email,
            google_user_id=payload.google_user_id,
            calendar_id=payload.calendar_id or "primary",
            access_token=payload.access_token,
            refresh_token=payload.refresh_token,
            token_type=payload.token_type,
            expires_at=payload.expires_at,
            scope=payload.scope,
            synced_at=datetime.utcnow(),
        )
        session.add(credential)
    else:
        credential.account_email = payload.account_email
        credential.google_user_id = payload.google_user_id
        credential.calendar_id = payload.calendar_id or credential.calendar_id or "primary"
        credential.access_token = payload.access_token
        credential.refresh_token = payload.refresh_token
        credential.token_type = payload.token_type
        credential.expires_at = payload.expires_at
        credential.scope = payload.scope
        credential.synced_at = datetime.utcnow()
        credential.client_id = resolved_client_id

    session.commit()
    session.refresh(credential)
    return _serialize_credential(credential)
