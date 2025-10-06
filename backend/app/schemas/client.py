from pydantic import BaseModel, ConfigDict
from sqlmodel import SQLModel


class ClientBranding(SQLModel):
    primary_color: str
    accent_color: str
    background_color: str
    surface_color: str
    muted_color: str
    on_primary_color: str
    on_surface_color: str
    logo_label: str
    logo_background_color: str
    logo_text_color: str


class ClientBase(SQLModel):
    name: str
    slug: str
    description: str | None = None
    branding: ClientBranding


class ClientCreate(ClientBase):
    pass


class ClientRead(ClientBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
