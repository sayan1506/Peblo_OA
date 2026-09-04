import json

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.storage.local import LocalStorage

SAMPLE_CATALOG = {
    "generated_at": "2026-09-04T00:00:00+00:00",
    "sections": [
        {
            "section": "featured",
            "shows": [
                {
                    "id": 1,
                    "slug": "motis-many-lives",
                    "title": "Moti's Many Lives",
                    "synopsis": "A dog reborn across India.",
                    "categories": ["adventure", "india", "friendship"],
                    "artwork": {"banner": "/static/artwork/banner/1.jpg"},
                    "seasons": [
                        {
                            "season_number": 1,
                            "episodes": [
                                {
                                    "content_group": "motis-many-lives-s01e01",
                                    "episode_number": 1,
                                    "title": "The Lost Kite",
                                    "duration_seconds": 510,
                                    "languages": ["en", "hi"],
                                    "artwork": {"thumbnail": "/static/artwork/thumbnail/1.jpg"},
                                },
                                {
                                    "content_group": "motis-many-lives-s01e02",
                                    "episode_number": 2,
                                    "title": "Rain on the Roof",
                                    "duration_seconds": 540,
                                    "languages": ["en"],
                                    "artwork": {},
                                },
                            ],
                        }
                    ],
                    "trailers": [
                        {
                            "content_group": "motis-many-lives-s00e01",
                            "episode_number": 1,
                            "title": "Trailer",
                            "duration_seconds": 75,
                            "languages": ["en"],
                            "artwork": {},
                        }
                    ],
                }
            ],
        },
        {
            "section": "series",
            "shows": [
                {
                    "id": 2,
                    "slug": "curious-cubs",
                    "title": "Curious Cubs",
                    "synopsis": "Science for kids.",
                    "categories": ["science", "nature"],
                    "artwork": {},
                    "seasons": [
                        {
                            "season_number": 1,
                            "episodes": [
                                {
                                    "content_group": "curious-cubs-s01e01",
                                    "episode_number": 1,
                                    "title": "Why Is The Sky Blue",
                                    "duration_seconds": 400,
                                    "languages": ["en"],
                                    "artwork": {},
                                }
                            ],
                        }
                    ],
                    "trailers": [],
                }
            ],
        },
    ],
}


@pytest.fixture
def client_with_catalog(tmp_path, monkeypatch):
    storage = LocalStorage(str(tmp_path))
    storage.put("catalog.json", json.dumps(SAMPLE_CATALOG).encode("utf-8"), "application/json")
    monkeypatch.setattr("app.routers.catalog.get_storage", lambda: storage)
    return TestClient(app)


@pytest.fixture
def client_no_catalog(tmp_path, monkeypatch):
    storage = LocalStorage(str(tmp_path))
    monkeypatch.setattr("app.routers.catalog.get_storage", lambda: storage)
    return TestClient(app)


def test_get_catalog_returns_published_file(client_with_catalog):
    resp = client_with_catalog.get("/catalog")
    assert resp.status_code == 200
    assert resp.json() == SAMPLE_CATALOG


def test_get_catalog_requires_no_auth(client_with_catalog):
    resp = client_with_catalog.get("/catalog")
    assert resp.status_code != 401
    assert resp.status_code != 403


def test_get_catalog_404_when_not_published(client_no_catalog):
    resp = client_no_catalog.get("/catalog")
    assert resp.status_code == 404


def test_search_404_when_not_published(client_no_catalog):
    resp = client_no_catalog.get("/catalog/search?q=moti")
    assert resp.status_code == 404


def test_search_matches_show_title(client_with_catalog):
    resp = client_with_catalog.get("/catalog/search?q=moti")
    data = resp.json()
    assert data["total"] == 3  # both season episodes + the trailer
    assert all(item["show_title"] == "Moti's Many Lives" for item in data["items"])


def test_search_matches_episode_title(client_with_catalog):
    resp = client_with_catalog.get("/catalog/search?q=kite")
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["episode_title"] == "The Lost Kite"


def test_search_matches_category_substring(client_with_catalog):
    resp = client_with_catalog.get("/catalog/search?q=advent")
    data = resp.json()
    assert data["total"] == 3  # all of moti's episodes, via the "adventure" category


def test_search_category_filter_is_exact_not_fuzzy(client_with_catalog):
    exact = client_with_catalog.get("/catalog/search?category=adventure").json()
    typo = client_with_catalog.get("/catalog/search?category=adventur").json()
    assert exact["total"] == 3
    assert typo["total"] == 0


def test_search_language_filter(client_with_catalog):
    resp = client_with_catalog.get("/catalog/search?language=hi")
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["episode_title"] == "The Lost Kite"


def test_search_section_filter(client_with_catalog):
    resp = client_with_catalog.get("/catalog/search?section=series")
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["show_title"] == "Curious Cubs"


def test_search_filters_compose(client_with_catalog):
    resp = client_with_catalog.get("/catalog/search?section=featured&language=hi")
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["episode_title"] == "The Lost Kite"


def test_search_reaches_trailer_via_query(client_with_catalog):
    resp = client_with_catalog.get("/catalog/search?q=trailer")
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["episode_title"] == "Trailer"


def test_search_no_filters_returns_everything(client_with_catalog):
    resp = client_with_catalog.get("/catalog/search")
    data = resp.json()
    assert data["total"] == 4  # 3 for moti's lives + 1 for curious cubs
