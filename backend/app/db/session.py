from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings
from app.db.seed import seed_database

engine = create_engine(settings.DATABASE_URL, echo=False, future=True)


def init_db() -> None:
    """Create database tables."""

    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        seed_database(session)


def get_session() -> Generator[Session, None, None]:
    """Yield a database session for dependency injection."""

    with Session(engine) as session:
        yield session
