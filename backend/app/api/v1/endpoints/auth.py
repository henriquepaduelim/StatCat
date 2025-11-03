from fastapi import APIRouter, Depends, HTTPException, status, Response # Added Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from fastapi.responses import JSONResponse # Added this import

from app.api.deps import authenticate_user, get_current_active_user
from app.core.security import create_access_token, get_password_hash
from app.db.session import get_session
from app.models.athlete import Athlete
from app.models.user import User, UserRole, AthleteStatus
from app.schemas.user import Token, UserCreate, UserRead, UserReadWithToken, UserSignup
from app.core.config import settings # Import settings to get origins

router = APIRouter()


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

    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
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
        athlete = Athlete(
            first_name=payload.full_name.split()[0] if payload.full_name else "Unknown",
            last_name=" ".join(payload.full_name.split()[1:]) if len(payload.full_name.split()) > 1 else "User",
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
            athlete_status=AthleteStatus.INCOMPLETE,  # Explicitly set status
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


@router.post("/login/full", response_model=None) # Changed return type
def login_with_profile(
    session: Session = Depends(get_session),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Response: # Changed return type
    user = authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    token = create_access_token(user.email)
    
    # Manually construct JSONResponse and add CORS headers
    response_data = UserReadWithToken(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        phone=user.phone,
        athlete_id=user.athlete_id,
        is_active=user.is_active,
        access_token=token,
    ).model_dump_json() # Use model_dump_json for Pydantic v2

    response = Response(content=response_data, media_type="application/json")

    # Determine the allowed origin from settings
    # This logic assumes frontend origin will always be the second
    # one in the list (after http://localhost:5173)
    allowed_origin = settings.BACKEND_CORS_ORIGINS[1] if len(settings.BACKEND_CORS_ORIGINS) > 1 else settings.BACKEND_CORS_ORIGINS[0]

    response.headers["Access-Control-Allow-Origin"] = allowed_origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"

    return response


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
