import json

from app.models import Artwork, Episode, Show
from app.services.validation import episode_publish_problems, show_publish_problems
from app.services.validation_report import _load_seed_issues
from app.storage.local import LocalStorage


def _show(**kwargs) -> Show:
    defaults = dict(slug="s", title="Show", section="featured", categories=[], status="draft")
    defaults.update(kwargs)
    return Show(**defaults)


def _episode(**kwargs) -> Episode:
    defaults = dict(
        season_id=1,
        episode_number=1,
        title="Ep",
        content_group="cg",
        language="en",
        duration_seconds=100,
        status="draft",
    )
    defaults.update(kwargs)
    ep = Episode(**defaults)
    ep.artworks = kwargs.get("artworks", [])
    return ep


def test_show_publish_problems_empty_when_section_set():
    assert show_publish_problems(_show(section="featured")) == []


def test_show_publish_problems_flags_missing_section():
    assert show_publish_problems(_show(section=None)) == ["a section"]


def test_episode_publish_problems_empty_when_duration_and_artwork_present():
    art = Artwork(id=1, kind="thumbnail", storage_key="k", width=1, height=1, size_bytes=1)
    ep = _episode(duration_seconds=100, artworks=[art])
    assert episode_publish_problems(ep) == []


def test_episode_publish_problems_flags_missing_duration_and_artwork_together():
    ep = _episode(duration_seconds=None, artworks=[])
    assert episode_publish_problems(ep) == ["a duration", "artwork"]


def test_episode_publish_problems_flags_only_missing_artwork():
    ep = _episode(duration_seconds=100, artworks=[])
    assert episode_publish_problems(ep) == ["artwork"]


def test_load_seed_issues_empty_when_never_written(tmp_path, monkeypatch):
    storage = LocalStorage(str(tmp_path))
    monkeypatch.setattr("app.services.validation_report.get_storage", lambda: storage)
    assert _load_seed_issues() == []


def test_load_seed_issues_reads_back_written_file(tmp_path, monkeypatch):
    storage = LocalStorage(str(tmp_path))
    payload = {"generated_at": "2026-09-04T00:00:00+00:00", "issues": [{"type": "duplicate_content_group_language"}]}
    storage.put("seed_data_issues.json", json.dumps(payload).encode("utf-8"), "application/json")
    monkeypatch.setattr("app.services.validation_report.get_storage", lambda: storage)
    assert _load_seed_issues() == payload["issues"]
