from app.services.catalog_diff import count_catalog, diff_catalogs


def _catalog(shows: list[dict]) -> dict:
    return {"generated_at": "2026-09-04T00:00:00+00:00", "sections": [{"section": "featured", "shows": shows}]}


def _show(slug: str, title: str, episodes: list[dict], trailers: list[dict] | None = None) -> dict:
    return {
        "id": 1,
        "slug": slug,
        "title": title,
        "synopsis": None,
        "categories": [],
        "artwork": {},
        "seasons": [{"season_number": 1, "episodes": episodes}] if episodes else [],
        "trailers": trailers or [],
    }


def _episode(content_group: str, title: str, **overrides) -> dict:
    defaults = {
        "content_group": content_group,
        "episode_number": 1,
        "title": title,
        "duration_seconds": 100,
        "languages": ["en"],
        "artwork": {},
    }
    defaults.update(overrides)
    return defaults


def test_no_previous_catalog_reports_everything_as_added():
    new = _catalog([_show("s1", "Show One", [_episode("cg1", "Ep One")])])

    diff = diff_catalogs(None, new)

    assert diff["shows_added"] == [{"slug": "s1", "title": "Show One"}]
    assert diff["episodes_added"] == [{"show_slug": "s1", "content_group": "cg1", "title": "Ep One"}]
    assert diff["shows_removed"] == []
    assert diff["episodes_changed"] == []


def test_identical_catalogs_produce_empty_diff():
    catalog = _catalog([_show("s1", "Show One", [_episode("cg1", "Ep One")])])

    diff = diff_catalogs(catalog, catalog)

    assert diff == {
        "shows_added": [],
        "shows_removed": [],
        "episodes_added": [],
        "episodes_removed": [],
        "episodes_changed": [],
    }


def test_detects_added_and_removed_shows():
    old = _catalog([_show("s1", "Show One", [_episode("cg1", "Ep One")])])
    new = _catalog([_show("s2", "Show Two", [_episode("cg2", "Ep Two")])])

    diff = diff_catalogs(old, new)

    assert diff["shows_added"] == [{"slug": "s2", "title": "Show Two"}]
    assert diff["shows_removed"] == [{"slug": "s1", "title": "Show One"}]


def test_detects_added_and_removed_episodes_within_same_show():
    old = _catalog([_show("s1", "Show One", [_episode("cg1", "Ep One")])])
    new = _catalog([_show("s1", "Show One", [_episode("cg2", "Ep Two")])])

    diff = diff_catalogs(old, new)

    assert diff["shows_added"] == []
    assert diff["shows_removed"] == []
    assert diff["episodes_added"] == [{"show_slug": "s1", "content_group": "cg2", "title": "Ep Two"}]
    assert diff["episodes_removed"] == [{"show_slug": "s1", "content_group": "cg1", "title": "Ep One"}]


def test_detects_changed_episode_fields():
    old = _catalog([_show("s1", "Show One", [_episode("cg1", "Ep One", duration_seconds=100)])])
    new = _catalog([_show("s1", "Show One", [_episode("cg1", "Ep One", duration_seconds=200)])])

    diff = diff_catalogs(old, new)

    assert diff["episodes_changed"] == [
        {"show_slug": "s1", "content_group": "cg1", "title": "Ep One", "changed_fields": ["duration_seconds"]}
    ]


def test_trailers_are_included_in_episode_diff():
    old = _catalog([_show("s1", "Show One", [], trailers=[])])
    new = _catalog([_show("s1", "Show One", [], trailers=[_episode("cg-trailer", "Trailer")])])

    diff = diff_catalogs(old, new)

    assert diff["episodes_added"] == [{"show_slug": "s1", "content_group": "cg-trailer", "title": "Trailer"}]


def test_count_catalog_counts_shows_and_collapsed_episodes():
    catalog = _catalog(
        [
            _show("s1", "Show One", [_episode("cg1", "Ep One"), _episode("cg2", "Ep Two")]),
            _show("s2", "Show Two", [], trailers=[_episode("cg-trailer", "Trailer")]),
        ]
    )

    assert count_catalog(catalog) == (2, 3)


def test_count_catalog_empty_when_no_shows():
    assert count_catalog(_catalog([])) == (0, 0)
