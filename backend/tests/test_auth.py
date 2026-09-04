from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi import HTTPException

from app.config import settings
from app.dependencies.auth import create_access_token, get_current_user, require_role


class _FakeUser:
    def __init__(self, id, role):
        self.id = id
        self.role = role


class _FakeDB:
    def __init__(self, users: dict):
        self._users = users

    def get(self, model, user_id):
        return self._users.get(user_id)


def test_create_access_token_round_trips_through_get_current_user():
    token = create_access_token(user_id=1, role="editor")
    db = _FakeDB({1: _FakeUser(1, "editor")})
    user = get_current_user(token=token, db=db)
    assert user.id == 1


def test_get_current_user_rejects_garbage_token():
    db = _FakeDB({})
    with pytest.raises(HTTPException) as exc:
        get_current_user(token="not-a-real-jwt", db=db)
    assert exc.value.status_code == 401


def test_get_current_user_rejects_expired_token():
    payload = {"sub": "1", "role": "editor", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)}
    expired = jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)
    db = _FakeDB({1: _FakeUser(1, "editor")})
    with pytest.raises(HTTPException) as exc:
        get_current_user(token=expired, db=db)
    assert exc.value.status_code == 401


def test_get_current_user_rejects_token_for_deleted_user():
    token = create_access_token(user_id=999, role="editor")
    db = _FakeDB({})  # user 999 doesn't exist
    with pytest.raises(HTTPException) as exc:
        get_current_user(token=token, db=db)
    assert exc.value.status_code == 401


def test_require_role_editor_allows_editor():
    dep = require_role("editor")
    assert dep(user=_FakeUser(1, "editor")).role == "editor"


def test_require_role_editor_allows_admin():
    # admin implies editor - the A2 decision this test actually verifies
    dep = require_role("editor")
    assert dep(user=_FakeUser(1, "admin")).role == "admin"


def test_require_role_admin_rejects_editor():
    dep = require_role("admin")
    with pytest.raises(HTTPException) as exc:
        dep(user=_FakeUser(1, "editor"))
    assert exc.value.status_code == 403
