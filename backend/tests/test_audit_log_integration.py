# Requires the dev Postgres instance running (docker-compose up -d db) and
# migrations applied - same precondition as test_role_enforcement_integration.py.
# Skipped automatically if the DB is unreachable.
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db import SessionLocal
from app.dependencies.security import hash_password
from app.main import app
from app.models import AuditLog, User

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
def admin_token(db_session):
    user = User(email="audit-test-admin@peblo.dev", hashed_password=hash_password("x"), role="admin")
    db_session.add(user)
    db_session.commit()
    try:
        resp = client.post("/auth/login", data={"username": user.email, "password": "x"})
        yield resp.json()["access_token"], user.id
    finally:
        db_session.query(AuditLog).filter(AuditLog.actor_id == user.id).delete()
        db_session.delete(user)
        db_session.commit()


@pytest.fixture
def editor_token(db_session):
    user = User(email="audit-test-editor@peblo.dev", hashed_password=hash_password("x"), role="editor")
    db_session.add(user)
    db_session.commit()
    try:
        resp = client.post("/auth/login", data={"username": user.email, "password": "x"})
        yield resp.json()["access_token"], user.id
    finally:
        db_session.query(AuditLog).filter(AuditLog.actor_id == user.id).delete()
        db_session.delete(user)
        db_session.commit()


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_create_update_delete_show_each_record_an_audit_entry(admin_token, db_session):
    token, actor_id = admin_token
    headers = _auth(token)

    create = client.post(
        "/shows",
        json={"slug": "audit-test-show", "title": "Audit Test Show", "categories": []},
        headers=headers,
    )
    assert create.status_code == 201
    show_id = create.json()["id"]

    update = client.patch(f"/shows/{show_id}", json={"section": "featured"}, headers=headers)
    assert update.status_code == 200

    delete = client.delete(f"/shows/{show_id}", headers=headers)
    assert delete.status_code == 204

    entries = (
        db_session.query(AuditLog)
        .filter(AuditLog.resource_type == "show", AuditLog.resource_id == show_id)
        .order_by(AuditLog.id)
        .all()
    )
    assert [e.action for e in entries] == ["created", "updated", "deleted"]
    assert all(e.actor_id == actor_id for e in entries)
    assert "Audit Test Show" in entries[0].summary
    assert "section" in entries[1].summary
    assert "Audit Test Show" in entries[2].summary


def test_audit_log_endpoint_returns_email_and_filters_by_resource(admin_token):
    token, _ = admin_token
    headers = _auth(token)

    create = client.post(
        "/shows",
        json={"slug": "audit-test-show-2", "title": "Audit Test Show 2", "categories": []},
        headers=headers,
    )
    show_id = create.json()["id"]

    resp = client.get(f"/admin/audit-log?resource_type=show&resource_id={show_id}", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["actor_email"] == "audit-test-admin@peblo.dev"
    assert body["items"][0]["action"] == "created"

    client.delete(f"/shows/{show_id}", headers=headers)


def test_audit_log_403_for_editor(editor_token):
    token, _ = editor_token
    resp = client.get("/admin/audit-log", headers=_auth(token))
    assert resp.status_code == 403
