from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlmodel import Session, select

from app.api.deps import ensure_roles, get_current_active_user
from app.core.config import settings
from app.core.crypto import encrypt_text
from app.db.session import get_session
from app.models.athlete import (
    Athlete,
    AthleteDetail,
    AthleteDocument,
    AthleteGender,
    AthletePayment,
)
from app.models.team import Team
from app.models.user import User, UserRole
from app.schemas.athlete import (
    AthleteCreate,
    AthleteRead,
    AthleteDocumentRead,
    AthleteRegistrationCompletion,
    AthleteRegistrationCreate,
    AthleteUpdate,
)

MANAGE_ATHLETE_ROLES = {UserRole.ADMIN, UserRole.STAFF}
READ_ATHLETE_ROLES = {UserRole.ADMIN, UserRole.STAFF, UserRole.COACH}

media_root = Path(settings.MEDIA_ROOT)
athlete_media_root = media_root / "athletes"
athlete_media_root.mkdir(parents=True, exist_ok=True)
documents_root = athlete_media_root / "documents"
documents_root.mkdir(parents=True, exist_ok=True)

MAX_DOCUMENT_SIZE = 10 * 1024 * 1024  # 10 MB

MAX_PHOTO_SIZE = 5 * 1024 * 1024  # 5 MB

def _safe_filename(filename: str | None) -> str:
    stem = (filename or "upload").replace("/", "_").replace("\\", "_")
    stem = stem.strip() or "upload"
    return stem


def _store_file(athlete_id: int, file: UploadFile, base_dir: Path, max_size: int) -> str:
    file.file.seek(0)
    data = file.file.read()
    if len(data) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Uploaded file exceeds allowed size",
        )

    destination_dir = base_dir / str(athlete_id)
    destination_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    safe_name = _safe_filename(file.filename)
    destination = destination_dir / f"{timestamp}_{safe_name}"
    destination.write_bytes(data)

    relative_path = destination.relative_to(media_root)
    return f"/media/{relative_path.as_posix()}"


router = APIRouter()

def _validate_team(session: Session, team_id: int | None) -> None:
    if team_id is None:
        return
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team not found",
        )


def _ensure_can_view(current_user: User, athlete: Athlete) -> None:
    if current_user.role in READ_ATHLETE_ROLES:
        return
    if current_user.role == UserRole.ATHLETE and current_user.athlete_id == athlete.id:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")


def _ensure_can_edit(current_user: User, athlete: Athlete) -> None:
    if current_user.role in MANAGE_ATHLETE_ROLES:
        return
    if current_user.role == UserRole.ATHLETE and current_user.athlete_id == athlete.id:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")


@router.post("/register", response_model=AthleteRead, status_code=status.HTTP_201_CREATED)
def register_athlete(
    payload: AthleteRegistrationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> AthleteRead:
    ensure_roles(current_user, MANAGE_ATHLETE_ROLES)
    data = payload.model_dump()

    team_id = data.get("team_id")
    _validate_team(session, team_id)

    preferred_position = data.get("preferred_position")

    email_value = data.get("email")
    phone_value = data.get("phone")
    if not email_value or not phone_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="email and phone are required",
        )
    email_value = email_value.strip()
    phone_value = phone_value.strip()
    if not email_value or not phone_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="email and phone are required",
        )

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
        primary_position=preferred_position or "unknown",
        preferred_position=preferred_position,
        desired_shirt_number=data.get("desired_shirt_number"),
    )

    session.add(athlete)
    session.commit()
    session.refresh(athlete)

    return athlete


@router.get("/", response_model=list[AthleteRead])
def list_athletes(
    gender: AthleteGender | None = None,
    team_id: int | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> list[AthleteRead]:
    statement = select(Athlete)
    if current_user.role == UserRole.ATHLETE:
        if current_user.athlete_id is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
        statement = statement.where(Athlete.id == current_user.athlete_id)
    if gender is not None:
        statement = statement.where(Athlete.gender == gender)
    if team_id is not None:
        statement = statement.where(Athlete.team_id == team_id)
    return session.exec(statement).all()


@router.post("/", response_model=AthleteRead, status_code=status.HTTP_201_CREATED)
def create_athlete(
    payload: AthleteCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> AthleteRead:
    ensure_roles(current_user, MANAGE_ATHLETE_ROLES)
    data = payload.model_dump()
    if not data.get("primary_position"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="primary_position is required",
        )
    _validate_team(session, data.get("team_id"))
    data["primary_position"] = data["primary_position"].strip()
    if data.get("secondary_position"):
        data["secondary_position"] = data["secondary_position"].strip()
    athlete = Athlete.model_validate(data)
    session.add(athlete)
    session.commit()
    session.refresh(athlete)
    return athlete


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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")
    _ensure_can_edit(current_user, athlete)

    detail = session.get(AthleteDetail, athlete_id)
    if not detail:
        detail = AthleteDetail(athlete_id=athlete_id)

    detail.email = payload.email
    detail.phone = payload.phone
    detail.address_line1 = payload.address_line1
    detail.address_line2 = payload.address_line2
    detail.city = payload.city
    detail.province = payload.province
    detail.postal_code = payload.postal_code
    detail.country = payload.country
    detail.guardian_name = payload.guardian_name
    detail.guardian_relationship = payload.guardian_relationship
    detail.guardian_email = payload.guardian_email
    detail.guardian_phone = payload.guardian_phone
    detail.secondary_guardian_name = payload.secondary_guardian_name
    detail.secondary_guardian_relationship = payload.secondary_guardian_relationship
    detail.secondary_guardian_email = payload.secondary_guardian_email
    detail.secondary_guardian_phone = payload.secondary_guardian_phone
    detail.emergency_contact_name = payload.emergency_contact_name
    detail.emergency_contact_relationship = payload.emergency_contact_relationship
    detail.emergency_contact_phone = payload.emergency_contact_phone
    detail.medical_allergies_encrypted = encrypt_text(payload.medical_allergies)
    detail.medical_conditions_encrypted = encrypt_text(payload.medical_conditions)
    detail.physician_name_encrypted = encrypt_text(payload.physician_name)
    detail.physician_phone_encrypted = encrypt_text(payload.physician_phone)
    detail.updated_at = datetime.utcnow()

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
                document.uploaded_at = datetime.utcnow()
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


@router.get("/{athlete_id}", response_model=AthleteRead)
def get_athlete(
    athlete_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> AthleteRead:
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")
    _ensure_can_view(current_user, athlete)
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")
    _ensure_can_edit(current_user, athlete)

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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")

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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")
    _ensure_can_edit(current_user, athlete)

    content_type = (file.content_type or "").lower()
    allowed_types = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/heic": ".heic",
        "image/heif": ".heif",
    }
    if content_type not in allowed_types:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")

    extension = allowed_types[content_type]

    athlete_dir = athlete_media_root / str(athlete_id)
    athlete_dir.mkdir(parents=True, exist_ok=True)
    destination = athlete_dir / f"profile{extension}"

    data = await file.read()
    if len(data) > MAX_PHOTO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image exceeds 5MB limit",
        )
    destination.write_bytes(data)

    relative_path = destination.relative_to(media_root)
    athlete.photo_url = f"/media/{relative_path.as_posix()}"
    session.add(athlete)
    session.commit()
    session.refresh(athlete)
    return athlete


@router.post(
    "/{athlete_id}/documents",
    status_code=status.HTTP_201_CREATED,
    response_model=AthleteDocumentRead,
)
def upload_document(
    athlete_id: int,
    label: str = Form(...),
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> AthleteDocument:
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")
    _ensure_can_edit(current_user, athlete)

    file_url = _store_file(athlete_id, file, documents_root, MAX_DOCUMENT_SIZE)

    document = AthleteDocument(athlete_id=athlete_id, label=label, file_url=file_url)
    session.add(document)
    session.commit()
    session.refresh(document)
    return document
