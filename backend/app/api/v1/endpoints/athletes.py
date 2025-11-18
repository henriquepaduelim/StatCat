from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlmodel import Session, delete, select

from app.api.deps import ensure_roles, get_current_active_user
from app.core.config import settings
from app.core.crypto import encrypt_text
from app.core.security import get_password_hash
from app.db.session import get_session
from app.models.athlete import Athlete, AthleteDetail, AthleteDocument, AthleteGender, AthletePayment
from app.models.assessment_session import AssessmentSession
from app.models.event import EventParticipant
from app.models.group import GroupMembership
from app.models.match_stat import MatchStat
from app.models.session_result import SessionResult
from app.models.team import Team
from app.models.user import User, UserRole, UserAthleteApprovalStatus
from app.schemas.athlete import (
    AthleteCreate,
    AthleteRead,
    AthleteDocumentRead,
    AthleteRegistrationCompletion,
    AthleteRegistrationCreate,
    AthleteUpdate,
)
from app.schemas.user import UserRead

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


def _cascade_delete_athlete(session: Session, athlete_id: int) -> None:
    """Remove dependent records before deleting the athlete to avoid FK errors."""
    session.exec(delete(SessionResult).where(SessionResult.athlete_id == athlete_id))
    session.exec(delete(MatchStat).where(MatchStat.athlete_id == athlete_id))
    session.exec(delete(EventParticipant).where(EventParticipant.athlete_id == athlete_id))
    session.exec(delete(GroupMembership).where(GroupMembership.athlete_id == athlete_id))
    session.exec(delete(AssessmentSession).where(AssessmentSession.athlete_id == athlete_id))
    session.exec(delete(AthleteDocument).where(AthleteDocument.athlete_id == athlete_id))
    session.exec(delete(AthletePayment).where(AthletePayment.athlete_id == athlete_id))
    session.exec(delete(AthleteDetail).where(AthleteDetail.athlete_id == athlete_id))
    session.exec(delete(User).where(User.athlete_id == athlete_id))


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
    include_user_status: bool = False,
    page: int = 1,
    size: int = 50,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> list[AthleteRead]:
    """List athletes with optional pagination.
    
    Args:
        page: Page number (1-indexed), default 1
        size: Items per page, default 50, max 100
    """
    # Validate pagination params
    if page < 1:
        page = 1
    if size < 1:
        size = 50
    if size > 100:
        size = 100
        
    statement = select(Athlete)
    if current_user.role == UserRole.ATHLETE:
        if current_user.athlete_id is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
        statement = statement.where(Athlete.id == current_user.athlete_id)
    if gender is not None:
        statement = statement.where(Athlete.gender == gender)
    if team_id is not None:
        statement = statement.where(Athlete.team_id == team_id)
    
    # Apply pagination
    offset = (page - 1) * size
    statement = statement.offset(offset).limit(size)
    
    athletes = session.exec(statement).all()
    
    # Optimize N+1 query: Preload user statuses for all athletes at once
    user_status_map = {}
    if include_user_status and current_user.role in MANAGE_ATHLETE_ROLES and athletes:
        athlete_ids = [athlete.id for athlete in athletes]
        users = session.exec(
            select(User).where(User.athlete_id.in_(athlete_ids))
        ).all()
        user_status_map = {user.athlete_id: user for user in users}
    
    result = []
    for athlete in athletes:
        try:
            # Use model_dump to get the base data
            athlete_dict = athlete.model_dump()
            
            # Add the additional fields required by AthleteRead
            athlete_dict['user_athlete_status'] = None
            athlete_dict['user_rejection_reason'] = None
            
            # If requested, enrich athletes with user status information
            if include_user_status and current_user.role in MANAGE_ATHLETE_ROLES:
                user = user_status_map.get(athlete.id)
                if user:
                    if user.athlete_status:
                        # Safely get the status value
                        if hasattr(user.athlete_status, 'value'):
                            athlete_dict['user_athlete_status'] = user.athlete_status.value
                        else:
                            athlete_dict['user_athlete_status'] = str(user.athlete_status)
                    athlete_dict['user_rejection_reason'] = user.rejection_reason
            
            result.append(AthleteRead(**athlete_dict))
        except Exception as e:
            print(f"Error processing athlete {athlete.id}: {e}")
            # Skip this athlete if there's an error
            continue
    
    return result


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


@router.get("/pending")
def get_pending_athletes(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get all pending athletes for admin/staff review."""
    print(f"=== PENDING ENDPOINT CALLED ===")
    print(f"User: {current_user.email}, Role: {current_user.role}")
    
    try:
        ensure_roles(current_user, MANAGE_ATHLETE_ROLES)
        
        # Include both PENDING and INCOMPLETE athletes that need approval
        pending_users = session.exec(
            select(User).where(
                User.athlete_id.isnot(None),  # Must have an athlete profile
                User.athlete_status.in_([
                    UserAthleteApprovalStatus.PENDING,
                    UserAthleteApprovalStatus.INCOMPLETE
                ])
            )
        ).all()
        
        print(f"Found {len(pending_users)} pending/incomplete users (need approval)")
        
        result = []
        for user in pending_users:
            athlete = (
                session.get(Athlete, user.athlete_id)
                if user.athlete_id is not None
                else None
            )

            first_name = athlete.first_name if athlete else (user.full_name.split(" ")[0] if user.full_name else "")
            last_name = (
                athlete.last_name
                if athlete
                else (" ".join(user.full_name.split(" ")[1:]) if user.full_name and len(user.full_name.split(" ")) > 1 else "")
            )

            result.append({
                "id": athlete.id if athlete else user.athlete_id,
                "user_id": user.id,
                "first_name": first_name,
                "last_name": last_name,
                "email": athlete.email if athlete and athlete.email else user.email,
                "user_email": user.email,
                "phone": athlete.phone if athlete else user.phone,
                "date_of_birth": athlete.birth_date.isoformat() if hasattr(athlete, "birth_date") and athlete and athlete.birth_date else None,
                "gender": athlete.gender.value if hasattr(athlete, "gender") and athlete and athlete.gender else None,
                "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
                "athlete_id": athlete.id if athlete else user.athlete_id,
                "athlete_status": user.athlete_status.value if hasattr(user.athlete_status, 'value') else str(user.athlete_status),
              })
        
        print(f"Returning {len(result)} results")
        return result
        
    except Exception as e:
        print(f"Error in get_pending_athletes: {e}")
        raise


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
                User.athlete_status.in_([
                    UserAthleteApprovalStatus.PENDING,
                    UserAthleteApprovalStatus.INCOMPLETE
                ]),
                User.role == UserRole.ATHLETE
            )
        ).all()
        
        return {"count": len(pending_users)}
    except Exception as e:
        # Return zero count if there's any error
        return {"count": 0}


@router.get("/pending-debug")
def debug_pending():
    """Ultra simple debug endpoint."""
    print("DEBUG ENDPOINT CALLED")
    return {"debug": "working"}


@router.get("/test-pending")
def test_pending_athletes(
    current_user: User = Depends(get_current_active_user),
):
    """Test endpoint for debugging pending athletes."""
    print(f"=== TEST ENDPOINT CALLED ===")
    print(f"User: {current_user.email}")
    print(f"Role: {current_user.role}")
    
    return {
        "message": "Test endpoint working",
        "user": {
            "email": current_user.email,
            "role": current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role),
        }
    }


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


@router.post("/{athlete_id}/approve", response_model=UserRead)
def approve_athlete(
    athlete_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Approve a pending athlete and update their status."""
    ensure_roles(current_user, MANAGE_ATHLETE_ROLES)
    
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")
    
    # Find the user associated with this athlete
    user = session.exec(select(User).where(User.athlete_id == athlete_id)).first()
    if not user:
        # Athletes created by admin may not have user accounts yet
        # Create a placeholder user account for them
        
        # Generate email if not present
        email = athlete.email if athlete.email else f"athlete{athlete_id}@temp.local"
        
        # Check if email already exists
        existing_user = session.exec(select(User).where(User.email == email)).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email {email} is already registered. Please update athlete's email first."
            )
        
        user = User(
            email=email,
            hashed_password=get_password_hash(f"temp{athlete_id}"),  # Temporary password
            full_name=f"{athlete.first_name} {athlete.last_name}",
            role=UserRole.ATHLETE,
            athlete_id=athlete_id,
            athlete_status=UserAthleteApprovalStatus.INCOMPLETE,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        print(f"INFO: Created user account for athlete {athlete_id} with email {email}")
    
    # Log current status for debugging
    print(f"DEBUG approve_athlete: athlete_id={athlete_id}, user_id={user.id}, current_status={user.athlete_status}")
    
    # If already approved, return success (idempotent operation)
    if user.athlete_status == UserAthleteApprovalStatus.APPROVED:
        print(f"INFO: Athlete {athlete_id} is already approved, returning success")
        return user
    
    # Allow approval for PENDING or INCOMPLETE status
    # INCOMPLETE: Athletes created by admin that haven't gone through registration
    # PENDING: Athletes who completed registration and submitted for approval
    if user.athlete_status not in [UserAthleteApprovalStatus.PENDING, UserAthleteApprovalStatus.INCOMPLETE]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Cannot approve athlete. Current status: {user.athlete_status}. Only PENDING or INCOMPLETE athletes can be approved."
        )
    
    user.athlete_status = UserAthleteApprovalStatus.APPROVED
    user.rejection_reason = None
    session.add(user)
    session.commit()
    session.refresh(user)
    
    print(f"INFO: Athlete {athlete_id} approved successfully")
    return user


@router.post("/approve-all")
def approve_all_pending_athletes(
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
        user.athlete_status = UserAthleteApprovalStatus.APPROVED
        user.rejection_reason = None
        session.add(user)
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
    print(f"DEBUG reject_athlete called: athlete_id={athlete_id}, reason='{reason}'")
    ensure_roles(current_user, MANAGE_ATHLETE_ROLES)
    
    athlete = session.get(Athlete, athlete_id)
    if not athlete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")
    
    # Find the user associated with this athlete
    user = session.exec(select(User).where(User.athlete_id == athlete_id)).first()
    if not user:
        # Athletes created by admin may not have user accounts yet
        # Create a placeholder user account for them
        
        # Generate email if not present
        email = athlete.email if athlete.email else f"athlete{athlete_id}@temp.local"
        print(f"DEBUG: No user for athlete {athlete_id}, will create with email: {email}")
        
        # Check if email already exists
        existing_user = session.exec(select(User).where(User.email == email)).first()
        if existing_user:
            print(f"ERROR reject: Email conflict - {email} already registered to user_id={existing_user.id} (athlete_id={existing_user.athlete_id})")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email {email} is already registered to user {existing_user.id}. This athlete cannot be rejected without first updating their email."
            )
        
        user = User(
            email=email,
            hashed_password=get_password_hash(f"temp{athlete_id}"),  # Temporary password
            full_name=f"{athlete.first_name} {athlete.last_name}",
            role=UserRole.ATHLETE,
            athlete_id=athlete_id,
            athlete_status=UserAthleteApprovalStatus.INCOMPLETE,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        print(f"INFO: Created user account for athlete {athlete_id} with email {email}")
    
    # Log current status for debugging
    print(f"DEBUG reject_athlete: athlete_id={athlete_id}, user_id={user.id}, current_status={user.athlete_status}")
    
    # If already rejected, allow re-rejection (just update reason)
    if user.athlete_status == UserAthleteApprovalStatus.REJECTED:
        print(f"INFO: Athlete {athlete_id} is already rejected, updating reason")
        user.rejection_reason = reason.strip()
        session.add(user)
        session.commit()
        session.refresh(user)
        return user
    
    # Allow rejection for PENDING or INCOMPLETE status
    if user.athlete_status not in [UserAthleteApprovalStatus.PENDING, UserAthleteApprovalStatus.INCOMPLETE]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Cannot reject athlete. Current status: {user.athlete_status}. Only PENDING or INCOMPLETE athletes can be rejected."
        )
    
    if not reason or not reason.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejection reason is required"
        )
    
    user.athlete_status = UserAthleteApprovalStatus.REJECTED
    user.rejection_reason = reason.strip()
    session.add(user)
    session.commit()
    session.refresh(user)
    
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")
    
    # Only the athlete themselves can submit for approval
    if current_user.role != UserRole.ATHLETE or current_user.athlete_id != athlete_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the athlete can submit their own registration")
    
    # Check if athlete is in the correct status
    if current_user.athlete_status != UserAthleteApprovalStatus.INCOMPLETE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Can only submit incomplete registrations for approval"
        )
    
    # Basic athlete information should be present (from Step 1)
    if not all([athlete.first_name, athlete.last_name, athlete.birth_date]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Basic athlete information (name and date of birth) is required before submitting for approval"
        )
    
    # Check if athlete detail exists - if not, it's okay, we'll allow submission with basic info
    detail = session.get(AthleteDetail, athlete_id)
    if detail:
        # If detail exists, only check essential contact information
        required_contact_fields = [detail.emergency_contact_name, detail.emergency_contact_phone]
        if not all(field and field.strip() for field in required_contact_fields if isinstance(field, str)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Emergency contact information is required before submitting for approval"
            )
    
    # Update status to PENDING
    current_user.athlete_status = UserAthleteApprovalStatus.PENDING
    current_user.rejection_reason = None  # Clear any previous rejection reason
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    
    return current_user
