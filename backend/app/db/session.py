from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, echo=False, future=True)


def init_db() -> None:
    """Create database tables."""

    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """Yield a database session for dependency injection."""

    with Session(engine) as session:
        yield session
