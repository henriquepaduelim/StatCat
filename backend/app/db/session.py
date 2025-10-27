from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings
from app.db.seed import seed_database

engine = create_engine(settings.DATABASE_URL, echo=False, future=True)


def _ensure_optional_columns() -> None:
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
        if "team_id" not in columns:
            connection.exec_driver_sql("ALTER TABLE athlete ADD COLUMN team_id INTEGER")
        if "primary_position" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE athlete ADD COLUMN primary_position VARCHAR(50) DEFAULT 'unknown'"
            )
        if "secondary_position" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE athlete ADD COLUMN secondary_position VARCHAR(50)"
            )
        if "phone" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE athlete ADD COLUMN phone VARCHAR(30)"
            )
        if "registration_year" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE athlete ADD COLUMN registration_year VARCHAR(20)"
            )
        if "registration_category" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE athlete ADD COLUMN registration_category VARCHAR(50)"
            )
        if "player_registration_status" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE athlete ADD COLUMN player_registration_status VARCHAR(50)"
            )
        if "preferred_position" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE athlete ADD COLUMN preferred_position VARCHAR(50)"
            )
        if "desired_shirt_number" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE athlete ADD COLUMN desired_shirt_number VARCHAR(10)"
            )
        connection.exec_driver_sql(
            "UPDATE athlete SET primary_position = 'unknown' WHERE primary_position IS NULL OR primary_position = ''"
        )

        team_columns = {
            row[1]
            for row in connection.exec_driver_sql("PRAGMA table_info(team)").fetchall()
        }
        if "coach_name" not in team_columns:
            connection.exec_driver_sql(
                "ALTER TABLE team ADD COLUMN coach_name VARCHAR(100)"
            )

        user_columns = {
            row[1]
            for row in connection.exec_driver_sql("PRAGMA table_info(user)").fetchall()
        }
        if "athlete_id" not in user_columns:
            connection.exec_driver_sql(
                "ALTER TABLE user ADD COLUMN athlete_id INTEGER"
            )
        if "phone" not in user_columns:
            connection.exec_driver_sql(
                "ALTER TABLE user ADD COLUMN phone VARCHAR(30)"
            )

        assessment_session_columns = {
            row[1]
            for row in connection.exec_driver_sql("PRAGMA table_info(assessmentsession)").fetchall()
        }
        if "athlete_id" not in assessment_session_columns:
            connection.exec_driver_sql(
                "ALTER TABLE assessmentsession ADD COLUMN athlete_id INTEGER"
            )



def init_db() -> None:
    """Create database tables."""

    SQLModel.metadata.create_all(engine)
    _ensure_optional_columns()
    with Session(engine) as session:
        seed_database(session)


def get_session() -> Generator[Session, None, None]:
    """Yield a database session for dependency injection."""

    with Session(engine) as session:
        yield session
