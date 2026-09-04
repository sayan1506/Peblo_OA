import os

from app.storage.local import LocalStorage


def test_put_writes_and_returns_url(tmp_path):
    storage = LocalStorage(str(tmp_path))
    url = storage.put("a.json", b'{"v": 1}', "application/json")

    assert url == "/static/a.json"
    assert (tmp_path / "a.json").read_bytes() == b'{"v": 1}'


def test_failed_rename_leaves_previous_file_untouched(tmp_path, monkeypatch):
    storage = LocalStorage(str(tmp_path))
    storage.put("catalog.json", b'{"version": 1}', "application/json")

    def failing_replace(*args, **kwargs):
        raise OSError("simulated crash before rename")

    monkeypatch.setattr("app.storage.local.os.replace", failing_replace)

    try:
        storage.put("catalog.json", b'{"version": 2, "corrupt": true}', "application/json")
        assert False, "expected OSError to propagate"
    except OSError:
        pass

    assert (tmp_path / "catalog.json").read_bytes() == b'{"version": 1}'


def test_failed_rename_leaves_no_orphaned_temp_file(tmp_path, monkeypatch):
    storage = LocalStorage(str(tmp_path))

    def failing_replace(*args, **kwargs):
        raise OSError("simulated crash before rename")

    monkeypatch.setattr("app.storage.local.os.replace", failing_replace)

    try:
        storage.put("new.json", b"data", "application/json")
    except OSError:
        pass

    assert os.listdir(tmp_path) == []


def test_republishing_same_key_overwrites_atomically(tmp_path):
    storage = LocalStorage(str(tmp_path))
    storage.put("catalog.json", b'{"version": 1}', "application/json")
    storage.put("catalog.json", b'{"version": 2}', "application/json")

    assert (tmp_path / "catalog.json").read_bytes() == b'{"version": 2}'
    assert os.listdir(tmp_path) == ["catalog.json"]
