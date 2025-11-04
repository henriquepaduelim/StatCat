from typing import Annotated

from email_validator import EmailNotValidError, validate_email
from pydantic import AfterValidator, ConfigDict
from sqlmodel import SQLModel

from app.models.user import UserRole, UserAthleteApprovalStatus


def _validate_email_allowing_local(value: str) -> str:
    if not isinstance(value, str):
        raise TypeError("email must be a string")
    candidate = value.strip()
    if "@" not in candidate:
        raise ValueError("Invalid email address")
    local_part, domain = candidate.rsplit("@", 1)
    if not local_part or not domain:
        raise ValueError("Invalid email address")
    if domain.lower().endswith(".local"):
        return candidate
    try:
        return validate_email(
            candidate,
            allow_smtputf8=True,
            allow_empty_local=False,
            check_deliverability=False,
        ).normalized
    except EmailNotValidError as exc:
        raise ValueError("Invalid email address") from exc


LocalEmailStr = Annotated[str, AfterValidator(_validate_email_allowing_local)]


class UserBase(SQLModel):
    email: LocalEmailStr
    full_name: str
    phone: str | None = None
    role: UserRole = UserRole.STAFF
    athlete_id: int | None = None
    athlete_status: UserAthleteApprovalStatus = UserAthleteApprovalStatus.INCOMPLETE
    rejection_reason: str | None = None
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserSignup(SQLModel):
    email: LocalEmailStr
    full_name: str
    password: str
    role: UserRole = UserRole.ATHLETE
    phone: str | None = None


class UserRead(UserBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class UserReadWithToken(UserRead):
    access_token: str
    token_type: str = "bearer"


class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(SQLModel):
    sub: str
    exp: int
