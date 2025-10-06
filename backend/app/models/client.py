from sqlmodel import Field, SQLModel


class Client(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    slug: str = Field(unique=True, index=True)
    description: str | None = None
    primary_color: str = "#0E4C92"
    accent_color: str = "#F97316"
    background_color: str = "#F1F5F9"
    surface_color: str = "#FFFFFF"
    muted_color: str = "#64748B"
    on_primary_color: str = "#FFFFFF"
    on_surface_color: str = "#111827"
    logo_label: str = "Combine"
    logo_background_color: str = "#0E4C92"
    logo_text_color: str = "#FFFFFF"
