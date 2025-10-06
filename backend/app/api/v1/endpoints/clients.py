from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.client import Client
from app.schemas.client import ClientBranding, ClientCreate, ClientRead

router = APIRouter()


def serialize_client(client: Client) -> ClientRead:
    branding = ClientBranding(
        primary_color=client.primary_color,
        accent_color=client.accent_color,
        background_color=client.background_color,
        surface_color=client.surface_color,
        muted_color=client.muted_color,
        on_primary_color=client.on_primary_color,
        on_surface_color=client.on_surface_color,
        logo_label=client.logo_label,
        logo_background_color=client.logo_background_color,
        logo_text_color=client.logo_text_color,
    )
    return ClientRead(
        id=client.id,
        name=client.name,
        slug=client.slug,
        description=client.description,
        branding=branding,
    )


@router.get("/", response_model=list[ClientRead])
def list_clients(session: Session = Depends(get_session)) -> list[ClientRead]:
    clients = session.exec(select(Client)).all()
    return [serialize_client(client) for client in clients]


@router.post("/", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def create_client(payload: ClientCreate, session: Session = Depends(get_session)) -> ClientRead:
    if session.exec(select(Client).where(Client.slug == payload.slug)).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug already exists")

    branding = payload.branding
    client = Client(
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        primary_color=branding.primary_color,
        accent_color=branding.accent_color,
        background_color=branding.background_color,
        surface_color=branding.surface_color,
        muted_color=branding.muted_color,
        on_primary_color=branding.on_primary_color,
        on_surface_color=branding.on_surface_color,
        logo_label=branding.logo_label,
        logo_background_color=branding.logo_background_color,
        logo_text_color=branding.logo_text_color,
    )
    session.add(client)
    session.commit()
    session.refresh(client)
    return serialize_client(client)


@router.get("/{client_id}", response_model=ClientRead)
def get_client(client_id: int, session: Session = Depends(get_session)) -> ClientRead:
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return serialize_client(client)
