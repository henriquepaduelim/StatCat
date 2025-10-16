from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError
from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import verify_password
from app.db.session import get_session
from app.models.user import User
from app.schemas.user import TokenPayload

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/login",
    auto_error=False,
)


def authenticate_user(session: Session, email: str, password: str) -> User | None:
    user = session.exec(select(User).where(User.email == email)).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def get_current_user(
    request: Request,
    session: Session = Depends(get_session),
    token: str | None = Depends(reusable_oauth2),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header[7:]

    try:
        if token is None:
            raise credentials_exception
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.SECURITY_ALGORITHM],
        )
        token_data = TokenPayload.model_validate(payload)
    except (JWTError, ValidationError):
        raise credentials_exception

    user = session.exec(select(User).where(User.email == token_data.sub)).first()
    if not user:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user
