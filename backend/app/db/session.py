from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings
from app.db.seed import seed_database

engine = create_engine(settings.DATABASE_URL, echo=False, future=True)


def _ensure_gender_column() -> None:
    with engine.begin() as connection:
        columns = {
            row[1]
            for row in connection.exec_driver_sql("PRAGMA table_info(athlete)").fetchall()
        }
        if "gender" not in columns:
            connection.exec_driver_sql("ALTER TABLE athlete ADD COLUMN gender VARCHAR(20)")
        connection.exec_driver_sql(
            "UPDATE athlete SET gender = 'male' WHERE gender IS NULL"
        )


def init_db() -> None:
    """Create database tables."""

    SQLModel.metadata.create_all(engine)
    _ensure_gender_column()
    with Session(engine) as session:
        seed_database(session)


def get_session() -> Generator[Session, None, None]:
    """Yield a database session for dependency injection."""

    with Session(engine) as session:
        yield session
