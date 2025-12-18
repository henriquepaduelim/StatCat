from datetime import datetime, timezone
import anyio
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app.api.deps import authenticate_user, get_current_active_user
from app.core.config import settings  # Import settings to get origins
from app.core.security import (
    create_access_token,
    create_signup_token,
    get_password_hash,
)
from app.core.security_token import security_token_manager
from app.db.session import get_session
from app.models.athlete import Athlete, AthleteGender
from app.models.user import User, UserRole, UserAthleteApprovalStatus
from app.schemas.user import (
    PasswordResetConfirm,
    PasswordResetRequest,
    PasswordResetResponse,
    Token,
    UserCreate,
    UserRead,
    UserReadWithToken,
    UserSignup,
    UserSelfUpdate,
    AthleteSignup,
    AthleteSignupResponse,
)
from app.services.email_service import EmailService

router = APIRouter()
email_service = EmailService()
PASSWORD_RESET_ALLOWED_ROLES = set(UserRole)
user_media_root = Path(settings.MEDIA_ROOT) / "users"
user_media_root.mkdir(parents=True, exist_ok=True)


def _generate_password_reset_token(user_id: int) -> str:
    payload = {"sub": user_id, "scope": "password_reset"}
    return security_token_manager.generate_token(
        payload, salt=settings.PASSWORD_RESET_TOKEN_SALT
    )


async def _handle_first_login(session: Session, user: User) -> None:
    """Update last_login and send welcome email on first login."""
    if (
        user.role == UserRole.ATHLETE
        and user.athlete_status != UserAthleteApprovalStatus.APPROVED
    ):
        # Do not treat as first login for pending athletes
        return
    first_login = user.last_login_at is None
    user.last_login_at = datetime.now(timezone.utc)
    session.add(user)
    session.commit()
    session.refresh(user)
    if first_login and user.email:
        await email_service.send_welcome_email(
            to_email=user.email, to_name=user.full_name or None
        )


def _validate_user_photo(file: UploadFile) -> str:
    content_type = (file.content_type or "").lower()
    ext = Path(file.filename or "").suffix.lower()
    if (
        ext not in settings.USER_ALLOWED_PHOTO_EXTENSIONS
        or content_type not in settings.USER_ALLOWED_PHOTO_MIME_TYPES
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type."
        )
    return ext


def _decode_password_reset_token(token: str) -> int:
    decoded = security_token_manager.verify_token(
        token,
        salt=settings.PASSWORD_RESET_TOKEN_SALT,
        max_age_seconds=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES * 60,
    )
    if not decoded or decoded.get("scope") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    sub = decoded.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token"
        )
    try:
        return int(sub)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token"
        ) from exc


@router.post("/login", response_model=Token)
async def login_access_token(
    session: Session = Depends(get_session),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Token:
    # Login attempt for user
    user = authenticate_user(session, form_data.username, form_data.password)
    if not user:
        # Authentication failed
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        # User is inactive
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )
    if (
        user.role == UserRole.ATHLETE
        and user.athlete_status != UserAthleteApprovalStatus.APPROVED
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account pending approval. Please wait for an admin to approve your registration.",
        )
    await _handle_first_login(session, user)

    token = create_access_token(user.email)
    return Token(access_token=token)


@router.get("/me", response_model=UserRead)
def read_users_me(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> dict:
    """Get current user information with properly serialized athlete status."""
    team_id = None
    if current_user.athlete_id:
        athlete_entity = session.get(Athlete, current_user.athlete_id)
        if athlete_entity:
            team_id = athlete_entity.team_id

    user_dict = {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "role": current_user.role,
        "athlete_id": current_user.athlete_id,
        "team_id": team_id,
        "is_active": current_user.is_active,
        "rejection_reason": current_user.rejection_reason,
    }

    # Ensure athlete_status is properly serialized
    if current_user.athlete_status:
        if hasattr(current_user.athlete_status, "value"):
            user_dict["athlete_status"] = current_user.athlete_status.value
        else:
            user_dict["athlete_status"] = str(current_user.athlete_status).lower()
    else:
        user_dict["athlete_status"] = None

    return user_dict


@router.put("/me", response_model=UserRead)
def update_me(
    payload: UserSelfUpdate,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> User:
    """Allow any logged-in user (including coaches) to update own profile and password."""
    # Update basic fields
    if payload.full_name:
        current_user.full_name = payload.full_name
    if payload.phone:
        current_user.phone = payload.phone

    # Change password if requested
    if payload.new_password:
        # If must_change_password is set, we don't require current_password
        if not current_user.must_change_password:
            if not payload.current_password:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current password is required to change password.",
                )
            authenticated = authenticate_user(
                session, current_user.email, payload.current_password
            )
            if not authenticated:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Current password is incorrect.",
                )
        current_user.hashed_password = get_password_hash(payload.new_password)
        current_user.must_change_password = False

    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user


@router.put("/me/photo", response_model=UserRead)
async def upload_user_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> User:
    """Upload/update avatar for the current user (any role)."""
    ext = _validate_user_photo(file)
    data = await file.read()
    if len(data) > settings.USER_PHOTO_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image exceeds size limit",
        )

    user_dir = user_media_root / str(current_user.id)
    user_dir.mkdir(parents=True, exist_ok=True)
    destination = user_dir / f"profile{ext}"
    destination.write_bytes(data)

    relative_path = destination.relative_to(Path(settings.MEDIA_ROOT))
    current_user.photo_url = f"/media/{relative_path.as_posix()}"
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user


@router.post(
    "/signup-athlete",
    response_model=AthleteSignupResponse,
    status_code=status.HTTP_201_CREATED,
)
def signup_athlete(
    payload: AthleteSignup,
    session: Session = Depends(get_session),
) -> AthleteSignupResponse:
    """Public signup for athletes. Creates user+athlete as INCOMPLETE and returns a short-lived onboarding token."""
    existing = session.exec(select(User).where(User.email == payload.email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    try:
        gender_value = AthleteGender(payload.gender.lower())
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid gender"
        ) from exc

    hashed_password = get_password_hash(payload.password)
    user = User(
        email=payload.email.strip(),
        hashed_password=hashed_password,
        full_name=payload.full_name.strip(),
        phone=payload.phone.strip() if payload.phone else None,
        role=UserRole.ATHLETE,
        athlete_status=UserAthleteApprovalStatus.INCOMPLETE,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    athlete = Athlete(
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        email=payload.email.strip(),
        phone=payload.phone.strip() if payload.phone else None,
        birth_date=payload.birth_date,
        gender=gender_value,
        primary_position="unknown",
        preferred_position=None,
    )
    session.add(athlete)
    session.commit()
    session.refresh(athlete)

    user.athlete_id = athlete.id
    session.add(user)
    session.commit()
    session.refresh(user)

    signup_token = create_signup_token(athlete.id)
    return AthleteSignupResponse(
        user_id=user.id,
        athlete_id=athlete.id,
        signup_token=signup_token,
    )


@router.get("/athlete-status")
def get_athlete_status(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> dict[str, str]:
    """Get the current athlete's status and rejection reason if applicable."""
    if current_user.role != UserRole.ATHLETE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only athletes can check status",
        )

    response = {
        "status": current_user.athlete_status.value,
    }

    if current_user.rejection_reason:
        response["rejection_reason"] = current_user.rejection_reason

    return response


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: UserCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    exists = session.exec(select(User).where(User.email == payload.email)).first()
    if exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    if payload.role == UserRole.ATHLETE:
        if payload.athlete_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Athlete users must reference an athlete",
            )
        athlete = session.get(Athlete, payload.athlete_id)
        if not athlete:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Athlete not found"
            )

    full_name = payload.full_name
    if payload.role == UserRole.COACH:
        name_parts = payload.full_name.split()
        if len(name_parts) > 1:
            first_initial = name_parts[0][0].upper()
            last_name = " ".join(name_parts[1:])
            full_name = f"Coach {first_initial}. {last_name}"
        else:
            full_name = f"Coach {payload.full_name}"

    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=full_name,
        phone=payload.phone,
        role=payload.role,
        athlete_id=payload.athlete_id,
        is_active=payload.is_active,
        must_change_password=True,  # force update on first login
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    # Send temp password email so the user can sign in and change it
    if user.email:
        anyio.from_thread.run(
            email_service.send_temp_password,
            user.email,
            user.full_name or None,
            payload.password,
        )
        anyio.from_thread.run(
            email_service.send_account_approved,
            user.email,
            user.full_name or None,
        )
    return user


@router.post("/signup", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def signup_user(
    payload: UserSignup,
    session: Session = Depends(get_session),
) -> User:
    try:
        role_value = (payload.role or "").strip().upper()
        normalized_role = UserRole.ATHLETE.value if not role_value else role_value
        if normalized_role != UserRole.ATHLETE.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Public signup is only available for athletes. Contact an admin for other roles.",
            )
        exists = session.exec(select(User).where(User.email == payload.email)).first()
        if exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Create a basic athlete record for the user
        from datetime import date

        name_parts = (payload.full_name or "Unknown").split()
        first_name = name_parts[0] if name_parts else "Unknown"
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

        athlete = Athlete(
            first_name=first_name,
            last_name=last_name,
            email=payload.email,
            phone=payload.phone or "",
            birth_date=date(
                2000, 1, 1
            ),  # Default date, will be updated during onboarding
            gender="male",  # Default value, will be updated during onboarding
            primary_position="unknown",
        )
        session.add(athlete)
        session.flush()  # Get the athlete ID without committing

        user = User(
            email=payload.email,
            hashed_password=get_password_hash(payload.password),
            full_name=payload.full_name,
            phone=payload.phone,
            role=UserRole.ATHLETE,
            athlete_id=athlete.id,
            athlete_status=UserAthleteApprovalStatus.INCOMPLETE,  # Explicitly set status
            is_active=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Notify user their signup is pending approval
        await email_service.send_registration_pending(
            to_email=user.email,
            to_name=user.full_name or None,
        )
        return user
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}",
        )


@router.post("/login/full", response_model=UserReadWithToken)
async def login_with_profile(
    session: Session = Depends(get_session),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> UserReadWithToken:
    user = authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )
    if (
        user.role == UserRole.ATHLETE
        and user.athlete_status != UserAthleteApprovalStatus.APPROVED
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account pending approval. Please wait for an admin to approve your registration.",
        )
    await _handle_first_login(session, user)

    token = create_access_token(user.email)

    return UserReadWithToken(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        phone=user.phone,
        athlete_id=user.athlete_id,
        is_active=user.is_active,
        access_token=token,
    )


@router.post(
    "/password-reset/request",
    response_model=PasswordResetResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def request_password_reset(
    payload: PasswordResetRequest,
    session: Session = Depends(get_session),
) -> PasswordResetResponse:
    """Send password reset instructions to any registered user (all roles)."""
    normalized_email = payload.email.strip()
    user = session.exec(select(User).where(User.email == normalized_email)).first()
    generic_detail = "If the email is registered to an eligible account, you'll receive reset instructions shortly."

    if not user:
        return PasswordResetResponse(detail=generic_detail)

    if user.role not in PASSWORD_RESET_ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password recovery is not enabled for this account.",
        )

    token = _generate_password_reset_token(user.id)
    await email_service.send_password_reset(
        to_email=user.email,
        to_name=user.full_name or "",
        reset_token=token,
        expires_minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES,
    )

    return PasswordResetResponse(detail=generic_detail)


@router.post(
    "/password-reset/confirm",
    response_model=PasswordResetResponse,
)
async def confirm_password_reset(
    payload: PasswordResetConfirm,
    session: Session = Depends(get_session),
) -> PasswordResetResponse:
    """Confirm password reset using a valid reset token (all roles supported)."""
    user_id = _decode_password_reset_token(payload.token)
    user = session.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    if user.role not in PASSWORD_RESET_ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password recovery is not enabled for this account.",
        )

    user.hashed_password = get_password_hash(payload.new_password)
    user.must_change_password = False
    session.add(user)
    session.commit()

    # Confirm to the user that the password was changed
    await email_service.send_password_change_confirmation(
        to_email=user.email,
        to_name=user.full_name or None,
    )
    return PasswordResetResponse(
        detail="Your password has been updated. You can sign in with your new credentials."
    )
