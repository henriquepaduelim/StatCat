from pydantic import ConfigDict, EmailStr
from sqlmodel import SQLModel


class UserBase(SQLModel):
    email: EmailStr
    full_name: str
    role: str = "staff"
    client_id: int | None = None
    is_active: bool = True


class UserCreate(UserBase):
    password: str


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
