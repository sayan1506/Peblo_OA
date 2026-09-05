# Requires the dev Postgres instance running (docker-compose up -d db) and
# migrations applied - same precondition as test_role_enforcement_integration.py.
# Skipped automatically if the DB is unreachable.
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db import SessionLocal
from app.dependencies.security import hash_password
from app.main import app
from app.models import Episode, PublishRun, Season, Show, User
from app.storage.local import LocalStorage

client = TestClient(app)


@pytest.fixture
def db_session():
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
    except Exception:
        pytest.skip("dev Postgres not reachable - run docker-compose up -d db")
    yield db
    db.close()


@pytest.fixture(autouse=True)
def isolated_storage(tmp_path, monkeypatch):
    # Publish/rollback here must never touch the real local storage/catalog.json -
    # same isolation test_catalog_search.py uses for the read side.
    storage = LocalStorage(str(tmp_path))
    monkeypatch.setattr("app.routers.admin.get_storage", lambda: storage)
    monkeypatch.setattr("app.routers.catalog.get_storage", lambda: storage)


@pytest.fixture
def admin_token(db_session):
    user = User(email="rollback-test-admin@peblo.dev", hashed_password=hash_password("x"), role="admin")
    db_session.add(user)
    db_session.commit()
    try:
        resp = client.post("/auth/login", data={"username": user.email, "password": "x"})
        yield resp.json()["access_token"]
    finally:
        db_session.query(PublishRun).filter(PublishRun.triggered_by == user.id).delete()
        db_session.delete(user)
        db_session.commit()


@pytest.fixture
def editor_token(db_session):
    user = User(email="rollback-test-editor@peblo.dev", hashed_password=hash_password("x"), role="editor")
    db_session.add(user)
    db_session.commit()
    try:
        resp = client.post("/auth/login", data={"username": user.email, "password": "x"})
        yield resp.json()["access_token"]
    finally:
        db_session.delete(user)
        db_session.commit()


@pytest.fixture
def show_with_episode(db_session):
    show = Show(slug="rollback-test-show", title="Rollback Test Show", section="featured", status="published")
    db_session.add(show)
    db_session.commit()
    season = Season(show_id=show.id, season_number=1)
    db_session.add(season)
    db_session.commit()
    episode = Episode(
        season_id=season.id,
        episode_number=1,
        title="Original Title",
        content_group="rollback-test-cg",
        language="en",
        duration_seconds=100,
        status="published",
    )
    db_session.add(episode)
    db_session.commit()
    try:
        yield show, episode
    finally:
        db_session.delete(episode)
        db_session.delete(season)
        db_session.delete(show)
        db_session.commit()


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_publish_then_change_then_rollback_restores_original_catalog(
    admin_token, db_session, show_with_episode
):
    show, episode = show_with_episode

    first = client.post("/admin/catalog/publish", headers=_auth(admin_token))
    assert first.status_code == 200
    first_run_id = first.json()["run_id"]
    first_catalog = client.get("/catalog").json()

    episode.title = "Changed Title"
    db_session.commit()

    second = client.post("/admin/catalog/publish", headers=_auth(admin_token))
    assert second.status_code == 200
    changed_catalog = client.get("/catalog").json()
    assert changed_catalog != first_catalog

    rollback = client.post(f"/admin/catalog/rollback/{first_run_id}", headers=_auth(admin_token))
    assert rollback.status_code == 200
    body = rollback.json()
    assert body["outcome"] == "rolled_back"
    assert body["rolled_back_from_id"] == first_run_id

    restored_catalog = client.get("/catalog").json()
    assert restored_catalog["sections"] == first_catalog["sections"]

    db_session.query(PublishRun).filter(
        PublishRun.id.in_([first_run_id, second.json()["run_id"], body["run_id"]])
    ).delete(synchronize_session=False)
    db_session.commit()


def test_rollback_404_for_missing_run(admin_token):
    resp = client.post("/admin/catalog/rollback/999999999", headers=_auth(admin_token))
    assert resp.status_code == 404


def test_rollback_409_for_run_without_snapshot(admin_token, db_session):
    from datetime import datetime, timezone

    admin_user = db_session.query(User).filter(User.email == "rollback-test-admin@peblo.dev").first()
    failed_run = PublishRun(
        triggered_by=admin_user.id,
        started_at=datetime.now(timezone.utc),
        finished_at=datetime.now(timezone.utc),
        outcome="failed",
        detail="simulated failure",
    )
    db_session.add(failed_run)
    db_session.commit()
    run_id = failed_run.id

    try:
        resp = client.post(f"/admin/catalog/rollback/{run_id}", headers=_auth(admin_token))
        assert resp.status_code == 409
    finally:
        db_session.query(PublishRun).filter(PublishRun.id == run_id).delete()
        db_session.commit()


def test_rollback_403_for_editor(editor_token):
    resp = client.post("/admin/catalog/rollback/1", headers=_auth(editor_token))
    assert resp.status_code == 403
