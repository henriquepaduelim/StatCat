from datetime import date, datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlmodel import SQLModel, Session, create_engine

from app.api.deps import get_current_active_user
from app.db.session import get_session
from app.main import app
from app.models.athlete import Athlete, AthleteGender
from app.models.password_setup_code import PasswordSetupCode
from app.models.user import User, UserAthleteApprovalStatus, UserRole


@pytest.fixture
def cascade_engine(tmp_path):
    db_path = tmp_path / "cascade.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    SQLModel.metadata.create_all(engine)
    with engine.begin() as connection:
        connection.exec_driver_sql("DROP TABLE IF EXISTS passwordsetupcode")
        connection.exec_driver_sql(
            """
            CREATE TABLE passwordsetupcode (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                code_hash VARCHAR(255) NOT NULL,
                expires_at DATETIME NOT NULL,
                used_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY(user_id) REFERENCES "user"(id) ON DELETE CASCADE
            )
            """
        )
        connection.exec_driver_sql(
            "CREATE INDEX ix_passwordsetupcode_user_id ON passwordsetupcode (user_id)"
        )
        connection.exec_driver_sql(
            "CREATE INDEX ix_passwordsetupcode_expires_at ON passwordsetupcode (expires_at)"
        )
        connection.exec_driver_sql(
            "CREATE INDEX ix_passwordsetupcode_used_at ON passwordsetupcode (used_at)"
        )

    yield engine
    engine.dispose()


@pytest.fixture(autouse=True)
def override_dependencies(cascade_engine):
    def _session_override():
        with Session(cascade_engine) as session:
            yield session

    app.dependency_overrides[get_session] = _session_override
    app.dependency_overrides[get_current_active_user] = lambda: User(
        email="admin@example.com",
        hashed_password="admin",
        full_name="Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    yield
    app.dependency_overrides.clear()


def test_deleting_athlete_cascades_password_codes(cascade_engine):
    client = TestClient(app)
    with Session(cascade_engine) as session:
        athlete = Athlete(
            first_name="Cascade",
            last_name="Test",
            email="cascade@example.com",
            phone="123456789",
            birth_date=date(2000, 1, 1),
            gender=AthleteGender.male,
            primary_position="ST",
        )
        session.add(athlete)
        session.commit()
        session.refresh(athlete)

        user = User(
            email="user@example.com",
            hashed_password="hashed",
            full_name="User Test",
            role=UserRole.ATHLETE,
            athlete_id=athlete.id,
            athlete_status=UserAthleteApprovalStatus.APPROVED,
            must_change_password=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        code = PasswordSetupCode(
            user_id=user.id,
            code_hash="hash",
            expires_at=datetime.now(timezone.utc),
        )
        session.add(code)
        session.commit()

        athlete_id = athlete.id
        user_id = user.id
        code_id = code.id

    resp = client.delete(f"/api/v1/athletes/{athlete_id}")
    assert resp.status_code == 204

    with Session(cascade_engine) as session:
        remaining_code = session.get(PasswordSetupCode, code_id)
        remaining_user = session.get(User, user_id)
        remaining_athlete = session.get(Athlete, athlete_id)

    assert remaining_code is None
    assert remaining_user is None
    assert remaining_athlete is None
