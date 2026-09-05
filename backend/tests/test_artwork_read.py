# Requires the dev Postgres instance running (docker-compose up -d db) and
# migrations applied - same precondition as test_role_enforcement_integration.py.
# Skipped automatically if the DB is unreachable.
from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import text

from app.db import SessionLocal
from app.dependencies.security import hash_password
from app.main import app
from app.models import AuditLog, Episode, Season, Show, User

client = TestClient(app)


def _jpeg_bytes(width: int, height: int) -> bytes:
    buf = BytesIO()
    Image.new("RGB", (width, height), color=(100, 150, 200)).save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def db_session():
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
    except Exception:
        pytest.skip("dev Postgres not reachable - run docker-compose up -d db")
    yield db
    db.close()


@pytest.fixture
def editor_token(db_session):
    user = User(email="a8-artwork-editor@peblo.dev", hashed_password=hash_password("x"), role="editor")
    db_session.add(user)
    db_session.commit()
    try:
        resp = client.post("/auth/login", data={"username": user.email, "password": "x"})
        yield resp.json()["access_token"]
    finally:
        db_session.query(AuditLog).filter(AuditLog.actor_id == user.id).delete()
        db_session.delete(user)
        db_session.commit()


@pytest.fixture
def show(db_session):
    s = Show(slug="a8-artwork-show", title="Artwork Read Test Show", status="draft")
    db_session.add(s)
    db_session.commit()
    yield s
    db_session.delete(s)
    db_session.commit()


@pytest.fixture
def episode(db_session, show):
    season = Season(show_id=show.id, season_number=1)
    db_session.add(season)
    db_session.commit()
    ep = Episode(
        season_id=season.id,
        episode_number=1,
        title="Artwork Read Test Episode",
        content_group="a8-artwork-cg",
        language="en",
        status="draft",
    )
    db_session.add(ep)
    db_session.commit()
    yield ep


def test_show_read_includes_artwork_after_upload(editor_token, show):
    headers = {"Authorization": f"Bearer {editor_token}"}

    resp = client.get(f"/shows/{show.id}", headers=headers)
    assert resp.json()["artwork"] == {}

    upload = client.post(
        "/artwork",
        params={"kind": "poster", "show_id": show.id},
        files={"file": ("poster.jpg", _jpeg_bytes(600, 900), "image/jpeg")},
        headers=headers,
    )
    assert upload.status_code == 201

    resp = client.get(f"/shows/{show.id}", headers=headers)
    assert resp.status_code == 200
    assert "poster" in resp.json()["artwork"]
    assert resp.json()["artwork"]["poster"].startswith("/static/")


def test_episode_read_includes_artwork_after_upload(editor_token, episode):
    headers = {"Authorization": f"Bearer {editor_token}"}

    resp = client.get(f"/episodes/{episode.id}", headers=headers)
    assert resp.json()["artwork"] == {}

    upload = client.post(
        "/artwork",
        params={"kind": "thumbnail", "episode_id": episode.id},
        files={"file": ("thumb.jpg", _jpeg_bytes(640, 360), "image/jpeg")},
        headers=headers,
    )
    assert upload.status_code == 201

    resp = client.get(f"/episodes/{episode.id}", headers=headers)
    assert resp.status_code == 200
    assert "thumbnail" in resp.json()["artwork"]
    assert resp.json()["artwork"]["thumbnail"].startswith("/static/")
