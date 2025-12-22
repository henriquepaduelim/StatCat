from datetime import datetime, timezone, timedelta
import logging
import secrets
from pathlib import Path
import anyio
import mimetypes

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlmodel import Session, delete, select, func
from sqlalchemy.orm import selectinload

from app.api.deps import ensure_roles, get_current_active_user
from app.core.config import settings
from app.core.crypto import encrypt_text
from app.core.security import get_password_hash
from app.core.security_token import security_token_manager
from app.db.session import get_session
from app.models.athlete import Athlete, AthleteGender
from app.models.athlete_detail import AthleteDetail
from app.models.athlete_document import AthleteDocument
from app.models.athlete_payment import AthletePayment
from app.models.assessment_session import AssessmentSession
from app.models.event_participant import EventParticipant
from app.models.group import GroupMembership
from app.models.match_stat import MatchStat
from app.models.session_result import SessionResult
from app.models.team import CoachTeamLink, Team
from app.models.user import User, UserRole, UserAthleteApprovalStatus
from app.models.password_setup_code import PasswordSetupCode
# from app.core.security import create_signup_token # Removed F401
from jose import jwt, JWTError
from app.services.email_service import email_service
from app.services.athlete_service import (
    build_athlete_query_for_user,
    MANAGE_ATHLETE_ROLES,
    approve_athlete as approve_athlete_service,
    reject_athlete as reject_athlete_service,
)
from app.services.storage_service import (
    StorageServiceError,
    athlete_document_key,
    athlete_photo_key,
    storage_service,
)
from app.schemas.athlete import (
    AthleteCreate,
    AthleteRead,
    AthleteCreateResponse,
    AthleteDocumentRead,
    AthleteRegistrationCompletion,
    AthleteRegistrationCreate,
    AthleteUpdate,
    # AthleteDocumentPayload, # Removed F401
    # AthletePaymentPayload, # Removed F401
)
from app.schemas.pagination import PaginatedResponse
from app.schemas.user import UserRead

media_root = Path(settings.MEDIA_ROOT)
athlete_media_root = media_root / "athletes"
athlete_media_root.mkdir(parents=True, exist_ok=True)
documents_root = athlete_media_root / "documents"
documents_root.mkdir(parents=True, exist_ok=True)

PASSWORD_CODE_EXPIRY_MINUTES = 45

def _generate_password_code(session: Session, user: User) -> str:
    """Generate a single-use 6-digit code for password setup."""
    code = f"{secrets.randbelow(900000) + 100000:06d}"
    code_hash = get_password_hash(code)
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=PASSWORD_CODE_EXPIRY_MINUTES
    )
    existing = session.exec(
        select(PasswordSetupCode).where(PasswordSetupCode.user_id == user.id)
    ).all()
    for item in existing:
        session.delete(item)
    password_code = PasswordSetupCode(
        user_id=user.id, code_hash=code_hash, expires_at=expires_at
    )
    session.add(password_code)
    session.commit()
    session.refresh(password_code)
    return code


def _safe_filename(filename: str | None) -> str:
    stem = (filename or "upload").replace("/", "_").replace("\\", "_")
    stem = stem.strip() or "upload"
    return stem


async def _upload_document_to_storage(
    athlete_id: int, label: str, file: UploadFile, max_size: int
) -> str:
    """Validate and upload an athlete document to Supabase Storage."""
    allowed_exts = settings.ATHLETE_ALLOWED_DOCUMENT_EXTENSIONS
    allowed_mimes = settings.ATHLETE_ALLOWED_DOCUMENT_MIME_TYPES
    ext = Path(file.filename or "").suffix.lower()
    content_type = (file.content_type or "").lower()
    if ext not in allowed_exts or (content_type and content_type not in allowed_mimes):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type.",
        )
    data = await file.read()
    if len(data) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Uploaded file exceeds allowed size",
        )
    if not storage_service.is_configured:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="File storage not configured",
        )
    resolved_content_type = content_type or (
        mimetypes.guess_type(f"file{ext}")[0] or "application/octet-stream"
    )
    key = athlete_document_key(athlete_id, label, ext)
    try:
        return await storage_service.upload_bytes(key, data, resolved_content_type)
    except StorageServiceError as exc:
        logger.error(
            "Failed to upload athlete document to storage (athlete=%s, key=%s): %s",
            athlete_id,
            key,
            exc,
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store file",
        )


router = APIRouter()
logger = logging.getLogger(__name__)


def _decode_signup_token(token: str, athlete_id: int) -> None:
    """Validate signup token scope and athlete id."""
    try:
        decoded = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.SECURITY_ALGORITHM]
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signup token"
        ) from exc
    if decoded.get("scope") != "signup":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signup token"
        )
    sub = decoded.get("sub") or ""
    if not sub.startswith("signup:"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signup token"
        )
    try:
        token_athlete_id = int(sub.split("signup:")[-1])
    except ValueError as exc:  # pragma: no cover
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signup token"
        ) from exc
    if token_athlete_id != athlete_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Signup token mismatch"
        )

def _get_signup_token(auth_header: str | None) -> str:
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Signup token required"
        )
    return auth_header.split(" ", 1)[1].strip()


@router.put(
    "/{athlete_id}/onboarding-public",
    response_model=AthleteRead,
    status_code=status.HTTP_200_OK,
)
def complete_registration_public(
    athlete_id: int,
    payload: AthleteRegistrationCompletion,
    authorization: str | None = None,
    session: Session = Depends(get_session),
) -> AthleteRead:
    """Complete onboarding using a signup token (no auth required)."""
    token = _get_signup_token(authorization)
    _decode_signup_token(token, athlete_id)

    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found"
        )

    detail = session.get(AthleteDetail, athlete_id)
    if not detail:
        detail = AthleteDetail(athlete_id=athlete_id)

    detail.email = payload.email
    detail.phone = payload.phone
    _encrypt_detail_fields(detail, payload)
    detail.updated_at = datetime.now(timezone.utc)

    if payload.email:
        athlete.email = payload.email
    if payload.phone:
        athlete.phone = payload.phone

    session.add(detail)
    session.add(athlete)

    if payload.documents:
        existing_docs = session.exec(
            select(AthleteDocument).where(AthleteDocument.athlete_id == athlete_id)
        ).all()
        docs_by_label = {doc.label: doc for doc in existing_docs}
        for doc_payload in payload.documents:
            document = docs_by_label.get(doc_payload.label)
            if document:
                document.file_url = doc_payload.file_url
                document.uploaded_at = datetime.now(timezone.utc)
                session.add(document)
            else:
                session.add(
                    AthleteDocument(
                        athlete_id=athlete_id,
                        label=doc_payload.label,
                        file_url=doc_payload.file_url,
                    )
                )

    payment_payload = payload.payment
    if payment_payload:
        payment_record = session.exec(
            select(AthletePayment).where(AthletePayment.athlete_id == athlete_id)
        ).first()
        if payment_record:
            payment_record.amount = payment_payload.amount
            payment_record.currency = payment_payload.currency
            payment_record.method = payment_payload.method
            payment_record.reference = payment_payload.reference
            payment_record.receipt_url = payment_payload.receipt_url
            payment_record.paid_at = payment_payload.paid_at
            session.add(payment_record)
        else:
            session.add(
                AthletePayment(
                    athlete_id=athlete_id,
                    amount=payment_payload.amount,
                    currency=payment_payload.currency,
                    method=payment_payload.method,
                    reference=payment_payload.reference,
                    receipt_url=payment_payload.receipt_url,
                    paid_at=payment_payload.paid_at,
                )
            )
    else:
        payment_record = session.exec(
            select(AthletePayment).where(AthletePayment.athlete_id == athlete_id)
        ).first()
        if payment_record:
            session.delete(payment_record)

    session.commit()
    session.refresh(athlete)
    return athlete


def _validate_team(session: Session, team_id: int | None) -> None:
    if team_id is None:
        return
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team not found",
        )


SENSITIVE_DETAIL_FIELDS = [
    "address_line1",
    "address_line2",
    "city",
    "province",
    "postal_code",
    "country",
    "guardian_name",
    "guardian_relationship",
    "guardian_email",
    "guardian_phone",
    "secondary_guardian_name",
    "secondary_guardian_relationship",
    "secondary_guardian_email",
    "secondary_guardian_phone",
    "emergency_contact_name",
    "emergency_contact_relationship",
    "emergency_contact_phone",
]


def _encrypt_detail_fields(
    detail: AthleteDetail, payload: AthleteRegistrationCompletion
) -> None:
    detail.address_line1 = encrypt_text(payload.address_line1)
    detail.address_line2 = encrypt_text(payload.address_line2)
    detail.city = encrypt_text(payload.city)
    detail.province = encrypt_text(payload.province)
    detail.postal_code = encrypt_text(payload.postal_code)
    detail.country = encrypt_text(payload.country)
    detail.guardian_name = encrypt_text(payload.guardian_name)
    detail.guardian_relationship = encrypt_text(payload.guardian_relationship)
    detail.guardian_email = encrypt_text(payload.guardian_email)
    detail.guardian_phone = encrypt_text(payload.guardian_phone)
    detail.secondary_guardian_name = encrypt_text(payload.secondary_guardian_name)
    detail.secondary_guardian_relationship = encrypt_text(
        payload.secondary_guardian_relationship
    )
    detail.secondary_guardian_email = encrypt_text(payload.secondary_guardian_email)
    detail.secondary_guardian_phone = encrypt_text(payload.secondary_guardian_phone)
    detail.emergency_contact_name = encrypt_text(payload.emergency_contact_name)
    detail.emergency_contact_relationship = encrypt_text(
        payload.emergency_contact_relationship
    )
    detail.emergency_contact_phone = encrypt_text(payload.emergency_contact_phone)
    detail.medical_allergies_encrypted = encrypt_text(payload.medical_allergies)
    detail.medical_conditions_encrypted = encrypt_text(payload.medical_conditions)
    detail.physician_name_encrypted = encrypt_text(payload.physician_name)
    detail.physician_phone_encrypted = encrypt_text(payload.physician_phone)


def _coach_team_ids(session: Session, coach_id: int) -> set[int]:
    team_ids = session.exec(
        select(CoachTeamLink.team_id).where(CoachTeamLink.user_id == coach_id)
    ).all()
    return {tid for tid in team_ids if tid is not None}

def _ensure_can_view(current_user: User, athlete: Athlete, session: Session) -> None:
    if current_user.role in MANAGE_ATHLETE_ROLES:
        return
    if current_user.role == UserRole.COACH:
        allowed_team_ids = _coach_team_ids(session, current_user.id)
        if athlete.team_id and athlete.team_id in allowed_team_ids:
            return
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    if current_user.role == UserRole.ATHLETE and current_user.athlete_id == athlete.id:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

def _ensure_can_edit(current_user: User, athlete: Athlete, session: Session) -> None:
    if current_user.role in MANAGE_ATHLETE_ROLES:
        return
    if current_user.role == UserRole.COACH:
        allowed_team_ids = _coach_team_ids(session, current_user.id)
        if athlete.team_id and athlete.team_id in allowed_team_ids:
            return
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    if current_user.role == UserRole.ATHLETE and current_user.athlete_id == athlete.id:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

def _cascade_delete_athlete(session: Session, athlete_id: int) -> None:
    """Remove dependent records before deleting the athlete to avoid FK errors."""
    session.exec(delete(SessionResult).where(SessionResult.athlete_id == athlete_id))
    session.exec(delete(MatchStat).where(MatchStat.athlete_id == athlete_id))
    session.exec(
        delete(EventParticipant).where(EventParticipant.athlete_id == athlete_id)
    )
    session.exec(
        delete(GroupMembership).where(GroupMembership.athlete_id == athlete_id)
    )
    session.exec(
        delete(AssessmentSession).where(AssessmentSession.athlete_id == athlete_id)
    )
    session.exec(
        delete(AthleteDocument).where(AthleteDocument.athlete_id == athlete_id)
    )
    session.exec(delete(AthletePayment).where(AthletePayment.athlete_id == athlete_id))
    session.exec(delete(AthleteDetail).where(AthleteDetail.athlete_id == athlete_id))
    session.exec(delete(User).where(User.athlete_id == athlete_id))


@router.post(
    "/register", response_model=AthleteRead, status_code=status.HTTP_201_CREATED
)
def register_athlete(
    payload: AthleteRegistrationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> AthleteRead:
    ensure_roles(current_user, MANAGE_ATHLETE_ROLES)
    data = payload.model_dump()

    team_id = data.get("team_id")
    _validate_team(session, team_id)

    preferred_position_raw = data.get("preferred_position")
    preferred_position = (
        preferred_position_raw.strip() if preferred_position_raw else None
    )

    email_value = (data.get("email") or "").strip().lower()
    phone_value = (data.get("phone") or "").strip()
    if not email_value or not phone_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="email and phone are required",
        )

    existing_user = session.exec(
        select(User).where(func.lower(User.email) == email_value)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists. Please use a different email for the athlete.",
        )

    try:
        athlete = Athlete(
            team_id=team_id,
            first_name=data["first_name"].strip(),
            last_name=data["last_name"].strip(),
            email=email_value,
            phone=phone_value,
            birth_date=data["birth_date"],
            gender=data["gender"],
            registration_year=data.get("registration_year"),
            registration_category=data.get("registration_category"),
            player_registration_status=data.get("player_registration_status"),
            primary_position=preferred_position,
            preferred_position=preferred_position,
            desired_shirt_number=data.get("desired_shirt_number"),
        )

        session.add(athlete)
        session.flush()

        user = User(
            email=email_value,
            hashed_password=get_password_hash(secrets.token_urlsafe(16)),
            full_name=f"{athlete.first_name} {athlete.last_name}".strip(),
            phone=phone_value,
            role=UserRole.ATHLETE,
            athlete_id=athlete.id,
            is_active=True,
            must_change_password=True,
            athlete_status=UserAthleteApprovalStatus.APPROVED,
        )
        session.add(user)
        session.commit()
        session.refresh(athlete)
        session.refresh(user)
    except Exception:
        session.rollback()
        raise

    try:
        code = _generate_password_code(session, user)
        anyio.from_thread.run(
            email_service.send_password_code,
            user.email,
            user.full_name or f"{athlete.first_name} {athlete.last_name}".strip(),
            code,
            PASSWORD_CODE_EXPIRY_MINUTES,
        )
    except Exception:
        logger.warning(
            "Failed to send password setup email for athlete %s",
            athlete.id,
            exc_info=True,
        )

    # Notify athlete about team assignment if email and team were provided
    if athlete.team_id and athlete.email:
        team = session.get(Team, athlete.team_id)
        team_name = team.name if team else "your team"
        anyio.from_thread.run(
            email_service.send_team_assignment,
            athlete.email,
            f"{athlete.first_name} {athlete.last_name}".strip(),
            team_name,
        )

    return athlete


@router.get("/", response_model=PaginatedResponse[AthleteRead])
def list_athletes(
    gender: AthleteGender | None = None,
    team_id: int | None = None,
    include_user_status: bool = False,
    page: int = 1,
    size: int = 50,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> PaginatedResponse[AthleteRead]:
    """List athletes with optional pagination."""
    if page < 1:
        page = 1
    if size < 1:
        size = 50
    if size > 100:
        size = 100

    statement = build_athlete_query_for_user(
        session=session,
        current_user=current_user,
        gender=gender,
        team_id=team_id,
    )

    # Get total count
    count_statement = select(func.count()).select_from(statement.subquery())
    total = session.exec(count_statement).one()

    # Apply pagination
    offset = (page - 1) * size
    statement = statement.offset(offset).limit(size)

    athletes = session.exec(statement).all()

    user_status_map = {}
    if include_user_status and current_user.role in MANAGE_ATHLETE_ROLES and athletes:
        athlete_ids = [athlete.id for athlete in athletes]
        users = session.exec(select(User).where(User.athlete_id.in_(athlete_ids))).all()
        user_status_map = {user.athlete_id: user for user in users}

    result_items = []
    for athlete in athletes:
        try:
            athlete_dict = athlete.model_dump()

            athlete_dict["user_athlete_status"] = None
            athlete_dict["user_rejection_reason"] = None

            if include_user_status and current_user.role in MANAGE_ATHLETE_ROLES:
                user = user_status_map.get(athlete.id)
                if user:
                    if user.athlete_status:
                        if hasattr(user.athlete_status, "value"):
                            athlete_dict["user_athlete_status"] = (
                                user.athlete_status.value
                            )
                        else:
                            athlete_dict["user_athlete_status"] = str(
                                user.athlete_status
                            )
                    athlete_dict["user_rejection_reason"] = user.rejection_reason

            result_items.append(AthleteRead(**athlete_dict))
        except Exception: # Modified: removed 'as e'
            continue

    return PaginatedResponse(
        total=total,
        page=page,
        size=size,
        items=result_items,
    )


@router.post(
    "/", response_model=AthleteCreateResponse, status_code=status.HTTP_201_CREATED
)
def create_athlete(
    payload: AthleteCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> AthleteCreateResponse:
    ensure_roles(current_user, MANAGE_ATHLETE_ROLES)
    data = payload.model_dump()
    email_raw = (data.get("email") or "").strip()
    email_normalized = email_raw.lower()

    if not email_normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Athletes must have an email address to create an account.",
        )

    if not data.get("primary_position"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="primary_position is required",
        )

    if email_normalized:
        existing_user = session.exec(
            select(User).where(func.lower(User.email) == email_normalized)
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists. Please use a different email for the athlete.",
            )

    _validate_team(session, data.get("team_id"))
    data["email"] = email_normalized
    data["primary_position"] = data["primary_position"].strip()
    if data.get("secondary_position"):
        data["secondary_position"] = data["secondary_position"].strip()
    data["athlete_status"] = UserAthleteApprovalStatus.APPROVED
    athlete = Athlete.model_validate(data)
    invite_status = "failed"
    try:
        session.add(athlete)
        session.flush()

        user = User(
            email=email_normalized,
            hashed_password=get_password_hash(secrets.token_urlsafe(16)),
            full_name=f"{athlete.first_name} {athlete.last_name}".strip()
            or email_normalized,
            role=UserRole.ATHLETE,
            athlete_id=athlete.id,
            is_active=True,
            must_change_password=True,
            athlete_status=UserAthleteApprovalStatus.APPROVED,
        )
        session.add(user)
        session.flush()
        session.commit()
        session.refresh(athlete)
        session.refresh(user)
    except Exception:
        session.rollback()
        raise

    code = _generate_password_code(session, user)
    try:
        sent = anyio.from_thread.run(
            email_service.send_password_code,
            email_normalized,
            user.full_name or athlete.first_name,
            code,
            PASSWORD_CODE_EXPIRY_MINUTES,
        )
        invite_status = "sent" if sent else "failed"
    except Exception:
        logger.warning(
            "Failed to send password setup email for athlete %s",
            athlete.id,
            exc_info=True,
        )

    if athlete.team_id and athlete.email:
        team = session.get(Team, athlete.team_id)
        team_name = team.name if team else "your team"
        anyio.from_thread.run(
            email_service.send_team_assignment,
            athlete.email,
            f"{athlete.first_name} {athlete.last_name}".strip(),
            team_name,
        )

    return AthleteCreateResponse(
        athlete=athlete,
        athlete_user_created=True,
        invite_status=invite_status,
    )


@router.post(
    "/{athlete_id}/registration/complete",
    response_model=AthleteRead,
    status_code=status.HTTP_200_OK,
)
def complete_registration(
    athlete_id: int,
    payload: AthleteRegistrationCompletion,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> AthleteRead:
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found"
        )
    _ensure_can_edit(current_user, athlete, session)

    detail = session.get(AthleteDetail, athlete_id)
    if not detail:
        detail = AthleteDetail(athlete_id=athlete_id)

    detail.email = payload.email
    detail.phone = payload.phone
    _encrypt_detail_fields(detail, payload)
    detail.updated_at = datetime.now(timezone.utc)

    if payload.email:
        athlete.email = payload.email
    if payload.phone:
        athlete.phone = payload.phone

    session.add(detail)
    session.add(athlete)

    # Do NOT automatically change status to PENDING
    # User will explicitly submit for approval later

    if payload.documents:
        existing_docs = session.exec(
            select(AthleteDocument).where(AthleteDocument.athlete_id == athlete_id)
        ).all()
        docs_by_label = {doc.label: doc for doc in existing_docs}
        for doc_payload in payload.documents:
            document = docs_by_label.get(doc_payload.label)
            if document:
                document.file_url = doc_payload.file_url
                document.uploaded_at = datetime.now(timezone.utc)
                session.add(document)
            else:
                session.add(
                    AthleteDocument(
                        athlete_id=athlete_id,
                        label=doc_payload.label,
                        file_url=doc_payload.file_url,
                    )
                )

    payment_payload = payload.payment
    if payment_payload:
        payment_record = session.exec(
            select(AthletePayment).where(AthletePayment.athlete_id == athlete_id)
        ).first()
        if payment_record:
            payment_record.amount = payment_payload.amount
            payment_record.currency = payment_payload.currency
            payment_record.method = payment_payload.method
            payment_record.reference = payment_payload.reference
            payment_record.receipt_url = payment_payload.receipt_url
            payment_record.paid_at = payment_payload.paid_at
            session.add(payment_record)
        else:
            session.add(
                AthletePayment(
                    athlete_id=athlete_id,
                    amount=payment_payload.amount,
                    currency=payment_payload.currency,
                    method=payment_payload.method,
                    reference=payment_payload.reference,
                    receipt_url=payment_payload.receipt_url,
                    paid_at=payment_payload.paid_at,
                )
            )
    else:
        payment_record = session.exec(
            select(AthletePayment).where(AthletePayment.athlete_id == athlete_id)
        ).first()
        if payment_record:
            session.delete(payment_record)

    session.commit()
    session.refresh(athlete)
    return athlete


@router.get("/pending")
def get_pending_athletes(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get all pending athletes for admin/staff review."""
    ensure_roles(current_user, MANAGE_ATHLETE_ROLES)

    pending_users = session.exec(
        select(User)
        .options(selectinload(User.athlete))
        .where(
            User.athlete_id.isnot(None),
            User.athlete_status.in_(
                [
                    UserAthleteApprovalStatus.PENDING,
                    UserAthleteApprovalStatus.INCOMPLETE,
                ]
            ),
        )
    ).all()

    result = []
    for user in pending_users:
        athlete = user.athlete

        first_name = (
            athlete.first_name
            if athlete
            else (user.full_name.split(" ")[0] if user.full_name else "")
        )
        last_name = (
            athlete.last_name
            if athlete
            else (
                " ".join(user.full_name.split(" ")[1:])
                if user.full_name and len(user.full_name.split(" ")) > 1
                else ""
            )
        )

        result.append(
            {
                "id": athlete.id if athlete else user.athlete_id,
                "user_id": user.id,
                "first_name": first_name,
                "last_name": last_name,
                "email": athlete.email if athlete and athlete.email else user.email,
                "phone": athlete.phone if athlete else user.phone,
                "date_of_birth": athlete.birth_date.isoformat()
                if hasattr(athlete, "birth_date") and athlete and athlete.birth_date
                else None,
                "gender": athlete.gender.value
                if hasattr(athlete, "gender") and athlete and athlete.gender
                else None,
                "role": user.role.value
                if hasattr(user.role, "value")
                else str(user.role),
                "athlete_id": athlete.id if athlete else user.athlete_id,
                "athlete_status": user.athlete_status.value
                if hasattr(user.athlete_status, "value")
                else str(user.athlete_status),
            }
        )

    return result


@router.get("/pending/count")
def get_pending_athletes_count(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> dict[str, int]:
    """Get the count of pending athletes for admin/staff users."""
    try:
        ensure_roles(current_user, MANAGE_ATHLETE_ROLES)

        # Include both PENDING and INCOMPLETE athletes that need approval
        pending_users = session.exec(
            select(User).where(
                User.athlete_id.isnot(None),  # Must have an athlete profile
                User.athlete_status.in_(
                    [
                        UserAthleteApprovalStatus.PENDING,
                        UserAthleteApprovalStatus.INCOMPLETE,
                    ]
                ),
                User.role == UserRole.ATHLETE,
            )
        ).all()

        return {"count": len(pending_users)}
    except Exception: # Modified: removed 'as e'
        # Return zero count if there's any error
        return {"count": 0}


@router.get("/{athlete_id}", response_model=AthleteRead)
def get_athlete(
    athlete_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> AthleteRead:
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found"
        )
    _ensure_can_view(current_user, athlete, session)
    return athlete


@router.patch("/{athlete_id}", response_model=AthleteRead)
def update_athlete(
    athlete_id: int,
    payload: AthleteUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> AthleteRead:
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found"
        )
    _ensure_can_edit(current_user, athlete, session)

    previous_team_id = athlete.team_id
    update_data = payload.model_dump(exclude_unset=True)
    if "team_id" in update_data:
        _validate_team(session, update_data.get("team_id"))

    if "primary_position" in update_data and update_data["primary_position"]:
        update_data["primary_position"] = update_data["primary_position"].strip()
    if "secondary_position" in update_data and update_data["secondary_position"]:
        update_data["secondary_position"] = update_data["secondary_position"].strip()

    for field, value in update_data.items():
        setattr(athlete, field, value)

    session.add(athlete)
    session.commit()
    session.refresh(athlete)

    # Notify user if they were moved to a different team
    if "team_id" in update_data and athlete.team_id != previous_team_id:
        user = session.exec(select(User).where(User.athlete_id == athlete.id)).first()
        if user and user.email:
            team_name = None
            if athlete.team_id:
                team = session.get(Team, athlete.team_id)
                team_name = team.name if team else None
            anyio.from_thread.run(
                email_service.send_team_assignment,
                user.email,
                user.full_name,
                team_name or "your team",
            )
    return athlete


@router.delete("/{athlete_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_athlete(
    athlete_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> None:
    ensure_roles(current_user, MANAGE_ATHLETE_ROLES)
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_NOT, detail="Athlete not found"
        )

    _cascade_delete_athlete(session, athlete_id)
    session.delete(athlete)
    session.commit()
    return None


@router.post("/{athlete_id}/photo", response_model=AthleteRead)
async def upload_photo(
    athlete_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> AthleteRead:
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found"
        )
    _ensure_can_edit(current_user, athlete, session)

    content_type = (file.content_type or "").lower()
    allowed_types = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/heic": ".heic",
        "image/heif": ".heif",
        "image/webp": ".webp",
    }
    if (
        content_type not in allowed_types
        or content_type not in settings.ATHLETE_ALLOWED_PHOTO_MIME_TYPES
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type"
        )

    extension = allowed_types[content_type]

    data = await file.read()
    if len(data) > settings.ATHLETE_PHOTO_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image exceeds 5MB limit",
        )

    if not storage_service.is_configured:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="File storage not configured",
        )

    key = athlete_photo_key(athlete_id, extension)
    try:
        photo_url = await storage_service.upload_bytes(key, data, content_type)
    except StorageServiceError as exc:
        logger.error(
            "Failed to upload athlete photo to storage (athlete=%s, key=%s): %s",
            athlete_id,
            key,
            exc,
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store file",
        )

    athlete.photo_url = photo_url
    session.add(athlete)
    session.commit()
    session.refresh(athlete)
    return athlete


@router.post(
    "/{athlete_id}/documents",
    status_code=status.HTTP_201_CREATED,
    response_model=AthleteDocumentRead,
)
async def upload_document(
    athlete_id: int,
    label: str = Form(...),
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> AthleteDocument:
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found"
        )
    _ensure_can_edit(current_user, athlete, session)

    file_url = await _upload_document_to_storage(
        athlete_id, label, file, settings.ATHLETE_DOCUMENT_MAX_BYTES
    )

    document = AthleteDocument(athlete_id=athlete_id, label=label, file_url=file_url)
    session.add(document)
    session.commit()
    session.refresh(document)
    return document


@router.post("/{athlete_id}/approve", response_model=UserRead)
async def approve_athlete(
    athlete_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Approve a pending athlete and update their status."""
    ensure_roles(current_user, MANAGE_ATHLETE_ROLES)
    await approve_athlete_service( # Modified: removed 'athlete ='
        session=session, athlete_id=athlete_id, approving=current_user
    )
    user = session.exec(select(User).where(User.athlete_id == athlete_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found for athlete"
        )
    return user


@router.post("/approve-all")
async def approve_all_pending_athletes(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> dict[str, int]:
    """Approve every pending or incomplete athlete user in one batch."""
    ensure_roles(current_user, MANAGE_ATHLETE_ROLES)

    pending_statuses = [
        UserAthleteApprovalStatus.PENDING,
        UserAthleteApprovalStatus.INCOMPLETE,
    ]
    pending_users = session.exec(
        select(User).where(
            User.role == UserRole.ATHLETE,
            User.athlete_status.in_(pending_statuses),
        )
    ).all()

    approved = 0
    skipped = 0

    for user in pending_users:
        if not user.athlete_id:
            skipped += 1
            continue
        athlete = session.get(Athlete, user.athlete_id)
        if not athlete:
            skipped += 1
            continue
        await approve_athlete_service(
            session=session, athlete_id=user.athlete_id, approving=current_user
        )
        approved += 1

    session.commit()
    return {"approved": approved, "skipped": skipped}


@router.post("/{athlete_id}/reject", response_model=UserRead)
def reject_athlete(
    athlete_id: int,
    reason: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Reject a pending athlete with a reason and update their status."""
    ensure_roles(current_user, MANAGE_ATHLETE_ROLES)
    reject_athlete_service( # Modified: removed 'athlete ='
        session=session, athlete_id=athlete_id, approving=current_user, reason=reason
    )
    # We return the associated user to keep response model unchanged
    user = session.exec(select(User).where(User.athlete_id == athlete_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found for athlete"
        )
    return user


@router.post("/{athlete_id}/submit-for-approval", response_model=UserRead)
def submit_for_approval(
    athlete_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Submit athlete registration for admin approval."""
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found"
        )

    # Only the athlete themselves can submit for approval
    if current_user.role != UserRole.ATHLETE or current_user.athlete_id != athlete_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the athlete can submit their own registration",
        )

    # Check if athlete is in the correct status
    if current_user.athlete_status != UserAthleteApprovalStatus.INCOMPLETE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only submit incomplete registrations for approval",
        )

    # Basic athlete information should be present (from Step 1)
    if not all([athlete.first_name, athlete.last_name, athlete.birth_date]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Basic athlete information (name and date of birth) is required before submitting for approval",
        )

    # Check if athlete detail exists - if not, it's okay, we'll allow submission with basic info
    detail = session.get(AthleteDetail, athlete_id)
    if detail:
        # If detail exists, only check essential contact information
        required_contact_fields = [
            detail.emergency_contact_name,
            detail.emergency_contact_phone,
        ]
        if not all(
            field and field.strip()
            for field in required_contact_fields
            if isinstance(field, str)
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Emergency contact information is required before submitting for approval",
            )

    # Update status to PENDING
    current_user.athlete_status = UserAthleteApprovalStatus.PENDING
    current_user.rejection_reason = None  # Clear any previous rejection reason
    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    return current_user


@router.post("/{athlete_id}/submit-for-approval-public", response_model=UserRead)
def submit_for_approval_public(
    athlete_id: int,
    authorization: str | None = None,
    session: Session = Depends(get_session),
) -> User:
    """Submit athlete registration for admin approval using a signup token."""
    token = _get_signup_token(authorization)
    _decode_signup_token(token, athlete_id)

    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found"
        )

    user = session.exec(select(User).where(User.athlete_id == athlete_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    if user.athlete_status != UserAthleteApprovalStatus.INCOMPLETE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only submit incomplete registrations for approval",
        )

    if not all([athlete.first_name, athlete.last_name, athlete.birth_date]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Basic athlete information (name and date of birth) is required before submitting for approval",
        )

    detail = session.get(AthleteDetail, athlete_id)
    if detail:
        required_contact_fields = [
            detail.emergency_contact_name,
            detail.emergency_contact_phone,
        ]
        if not all(
            field and field.strip()
            for field in required_contact_fields
            if isinstance(field, str)
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Emergency contact information is required before submitting for approval",
            )

    user.athlete_status = UserAthleteApprovalStatus.PENDING
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
