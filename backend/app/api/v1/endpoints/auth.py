from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlmodel import Session, select

from app.api.deps import authenticate_user, get_current_active_user
from app.core.config import settings  # Import settings to get origins
from app.core.security import create_access_token, get_password_hash
from app.db.session import get_session
from app.models.athlete import Athlete
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
)
from app.services.email_service import EmailService

router = APIRouter()
email_service = EmailService()
PASSWORD_RESET_ALLOWED_ROLES = {UserRole.ADMIN, UserRole.ATHLETE}


def _generate_password_reset_token(user_id: int) -> str:
    expires_minutes = settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    payload = {
        "sub": str(user_id),
        "scope": "password_reset",
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.SECURITY_ALGORITHM)


def _decode_password_reset_token(token: str) -> int:
    try:
        decoded = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.SECURITY_ALGORITHM],
        )
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token") from exc
    if decoded.get("scope") != "password_reset":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token")
    sub = decoded.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token")
    try:
        return int(sub)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token") from exc


@router.post("/login", response_model=Token)
def login_access_token(
    session: Session = Depends(get_session),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Token:
    # Login attempt for user
    user = authenticate_user(session, form_data.username, form_data.password)
    if not user:
        # Authentication failed
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        # User is inactive
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    token = create_access_token(user.email)
    print(f"Token created for user {user.email}: {token[:20]}...")
    return Token(access_token=token)


@router.get("/me", response_model=UserRead)
def read_users_me(current_user: User = Depends(get_current_active_user)) -> dict:
    """Get current user information with properly serialized athlete status."""
    print(f"GET /auth/me called for user: {current_user.email}")
    print(f"User athlete_status: {current_user.athlete_status}")
    
    user_dict = {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "role": current_user.role,
        "athlete_id": current_user.athlete_id,
        "is_active": current_user.is_active,
        "rejection_reason": current_user.rejection_reason,
    }
    
    # Ensure athlete_status is properly serialized
    if current_user.athlete_status:
        if hasattr(current_user.athlete_status, 'value'):
            user_dict['athlete_status'] = current_user.athlete_status.value
        else:
            user_dict['athlete_status'] = str(current_user.athlete_status)
    else:
        user_dict['athlete_status'] = "INCOMPLETE"
    
    print(f"Returning user_dict: {user_dict}")
    return user_dict


@router.get("/athlete-status")
def get_athlete_status(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> dict[str, str]:
    """Get the current athlete's status and rejection reason if applicable."""
    if current_user.role != UserRole.ATHLETE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only athletes can check status")
    
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    if payload.role == UserRole.ATHLETE:
        if payload.athlete_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Athlete users must reference an athlete",
            )
        athlete = session.get(Athlete, payload.athlete_id)
        if not athlete:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Athlete not found")

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
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.post("/signup", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def signup_user(
    payload: UserSignup,
    session: Session = Depends(get_session),
) -> User:
    try:
        exists = session.exec(select(User).where(User.email == payload.email)).first()
        if exists:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

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
            birth_date=date(2000, 1, 1),  # Default date, will be updated during onboarding
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
            role=payload.role,
            athlete_id=athlete.id,
            athlete_status=UserAthleteApprovalStatus.INCOMPLETE,  # Explicitly set status
            is_active=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Registration failed: {str(e)}")


@router.post("/login/full", response_model=UserReadWithToken)
def login_with_profile(
    session: Session = Depends(get_session),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> UserReadWithToken:
    user = authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

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
    """Send password reset instructions to admins and athletes."""
    normalized_email = payload.email.strip()
    user = session.exec(select(User).where(User.email == normalized_email)).first()
    generic_detail = "If the email is registered to an eligible account, you'll receive reset instructions shortly."

    if not user:
        return PasswordResetResponse(detail=generic_detail)

    if user.role not in PASSWORD_RESET_ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password recovery is currently available for administrators and athletes only.",
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
def confirm_password_reset(
    payload: PasswordResetConfirm,
    session: Session = Depends(get_session),
) -> PasswordResetResponse:
    """Confirm password reset using a valid reset token."""
    user_id = _decode_password_reset_token(payload.token)
    user = session.get(User, user_id)

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.role not in PASSWORD_RESET_ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password recovery is currently available for administrators and athletes only.",
        )

    user.hashed_password = get_password_hash(payload.new_password)
    session.add(user)
    session.commit()
    return PasswordResetResponse(detail="Your password has been updated. You can sign in with your new credentials.")


@router.get("/debug/token")
def debug_token(
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Debug endpoint to check token validation."""
    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "athlete_id": current_user.athlete_id,
        "athlete_status": current_user.athlete_status.value if current_user.athlete_status else None,
        "is_active": current_user.is_active,
    }


@router.get("/test-debug")
def test_debug_endpoint():
    """Test debug endpoint in auth."""
    print("AUTH DEBUG ENDPOINT CALLED")
    return {"test": "working", "location": "auth"}
