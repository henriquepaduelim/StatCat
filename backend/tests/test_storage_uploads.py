from datetime import date, datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from app.api.deps import get_current_active_user, get_session
from app.main import app
from app.models.athlete import Athlete, AthleteGender
from app.models.team import Team
from app.models.user import User, UserRole, UserAthleteApprovalStatus
from app.services.storage_service import storage_service as storage_module


@pytest.fixture
def test_engine(tmp_path):
    db_path = tmp_path / "storage.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def current_user_holder():
    return {}


@pytest.fixture(autouse=True)
def override_deps(test_engine, current_user_holder):
    def _session_override():
        with Session(test_engine) as session:
            yield session

    def _current_user():
        return current_user_holder["user"]

    app.dependency_overrides[get_session] = _session_override
    app.dependency_overrides[get_current_active_user] = _current_user
    yield
    app.dependency_overrides.clear()


def _configure_storage(monkeypatch, captured):
    storage_module.base_url = "https://example.supabase.co"
    storage_module.bucket = "public"
    storage_module.service_key = "key"

    async def fake_upload(key, data, content_type):
        captured["key"] = key
        captured["data"] = data
        captured["content_type"] = content_type
        return f"https://example.supabase.co/storage/v1/object/public/public/{key}"

    monkeypatch.setattr(storage_module, "upload_bytes", fake_upload)


def test_user_photo_upload_uses_supabase(monkeypatch, test_engine, current_user_holder):
    with Session(test_engine) as session:
        user = User(
            email="user@test.com",
            hashed_password="x",
            full_name="Admin",
            role=UserRole.ADMIN,
            is_active=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        current_user_holder["user"] = user

    captured = {}
    _configure_storage(monkeypatch, captured)

    client = TestClient(app)
    resp = client.put(
        "/api/v1/auth/me/photo",
        files={"file": ("avatar.png", b"img-bytes", "image/png")},
    )
    assert resp.status_code == 200
    assert captured["content_type"] == "image/png"
    assert captured["key"].startswith(f"users/{current_user_holder['user'].id}/profile/")
    body = resp.json()
    assert body["photo_url"] == f"https://example.supabase.co/storage/v1/object/public/public/{captured['key']}"

    with Session(test_engine) as session:
        db_user = session.get(User, current_user_holder["user"].id)
        assert db_user.photo_url == body["photo_url"]


def test_athlete_photo_upload_uses_supabase(monkeypatch, test_engine, current_user_holder):
    with Session(test_engine) as session:
        athlete = Athlete(
            first_name="Photo",
            last_name="Test",
            email="photo@test.com",
            phone="123",
            birth_date=date(2000, 1, 1),
            gender=AthleteGender.male,
            primary_position="ST",
        )
        session.add(athlete)
        session.commit()
        session.refresh(athlete)
        athlete_id = athlete.id
        admin_user = User(
            email="admin@test.com",
            hashed_password="x",
            full_name="Admin",
            role=UserRole.ADMIN,
            is_active=True,
        )
        session.add(admin_user)
        session.commit()
        session.refresh(admin_user)
        current_user_holder["user"] = admin_user

    captured = {}
    _configure_storage(monkeypatch, captured)

    client = TestClient(app)
    resp = client.post(
        f"/api/v1/athletes/{athlete_id}/photo",
        files={"file": ("profile.webp", b"img", "image/webp")},
    )
    assert resp.status_code == 200
    assert captured["key"].startswith(f"athletes/{athlete_id}/profile/")
    assert captured["content_type"] == "image/webp"
    body = resp.json()
    assert body["photo_url"] == f"https://example.supabase.co/storage/v1/object/public/public/{captured['key']}"

    with Session(test_engine) as session:
        db_athlete = session.get(Athlete, athlete_id)
        assert db_athlete.photo_url == body["photo_url"]


def test_athlete_document_upload_uses_supabase(monkeypatch, test_engine, current_user_holder):
    with Session(test_engine) as session:
        athlete = Athlete(
            first_name="Doc",
            last_name="Test",
            email="doc@test.com",
            phone="123",
            birth_date=date(2000, 1, 1),
            gender=AthleteGender.male,
            primary_position="ST",
        )
        session.add(athlete)
        session.commit()
        session.refresh(athlete)
        athlete_id = athlete.id
        admin_user = User(
            email="admin@test.com",
            hashed_password="x",
            full_name="Admin",
            role=UserRole.ADMIN,
            is_active=True,
        )
        session.add(admin_user)
        session.commit()
        session.refresh(admin_user)
        current_user_holder["user"] = admin_user

    captured = {}
    _configure_storage(monkeypatch, captured)

    client = TestClient(app)
    resp = client.post(
        f"/api/v1/athletes/{athlete_id}/documents",
        files={"file": ("id.pdf", b"pdf-bytes", "application/pdf")},
        data={"label": "id_doc"},
    )
    assert resp.status_code == 201
    assert captured["key"].startswith(f"athletes/{athlete_id}/documents/id_doc/")
    body = resp.json()
    assert body["file_url"] == f"https://example.supabase.co/storage/v1/object/public/public/{captured['key']}"


def test_team_post_media_upload_uses_supabase(monkeypatch, test_engine, current_user_holder):
    with Session(test_engine) as session:
        team = Team(
            name="Team A",
            age_category="U12",
            created_by_id=None,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        session.add(team)
        session.commit()
        session.refresh(team)
        team_id = team.id
        admin_user = User(
            email="admin@test.com",
            hashed_password="x",
            full_name="Admin",
            role=UserRole.ADMIN,
            is_active=True,
        )
        session.add(admin_user)
        session.commit()
        session.refresh(admin_user)
        current_user_holder["user"] = admin_user

    captured = {}
    _configure_storage(monkeypatch, captured)

    client = TestClient(app)
    resp = client.post(
        f"/api/v1/teams/{team_id}/posts",
        data={"content": ""},
        files={"media": ("clip.mp4", b"video-bytes", "video/mp4")},
    )
    assert resp.status_code == 201
    assert captured["key"].startswith(f"team_posts/{team_id}/")
    body = resp.json()
    assert body["media_url"] == f"https://example.supabase.co/storage/v1/object/public/public/{captured['key']}"
