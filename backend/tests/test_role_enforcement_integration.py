# Requires the dev Postgres instance running (docker-compose up -d db) and
# migrations applied - same precondition as every manual verification this
# project has run all along. Skipped automatically if the DB is unreachable,
# so `pytest` still passes in an environment with no DB configured.
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db import SessionLocal
from app.dependencies.security import hash_password
from app.main import app
from app.models import User

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


@pytest.fixture
def editor_token(db_session):
    user = User(email="a8-test-editor@peblo.dev", hashed_password=hash_password("x"), role="editor")
    db_session.add(user)
    db_session.commit()
    try:
        resp = client.post("/auth/login", data={"username": user.email, "password": "x"})
        yield resp.json()["access_token"]
    finally:
        db_session.delete(user)
        db_session.commit()


def test_editor_token_rejected_on_admin_only_publish_route(editor_token):
    resp = client.post(
        "/admin/catalog/publish", headers={"Authorization": f"Bearer {editor_token}"}
    )
    assert resp.status_code == 403


def test_no_token_rejected_on_editor_route():
    resp = client.get("/shows")
    assert resp.status_code == 401


def test_editor_token_allowed_on_editor_only_validation_report(editor_token):
    resp = client.get(
        "/admin/validation-report", headers={"Authorization": f"Bearer {editor_token}"}
    )
    assert resp.status_code == 200


def test_editor_token_allowed_on_editor_only_publish_runs(editor_token):
    resp = client.get(
        "/admin/publish-runs", headers={"Authorization": f"Bearer {editor_token}"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert set(body.keys()) == {"items", "total", "page", "page_size"}


def test_no_token_rejected_on_publish_runs():
    resp = client.get("/admin/publish-runs")
    assert resp.status_code == 401
