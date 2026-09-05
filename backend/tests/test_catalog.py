from app.models import Artwork, Episode
from app.models.artwork import artwork_url_map
from app.services.catalog import _collapse_episodes, _pick_canonical


def _episode(**kwargs) -> Episode:
    defaults = dict(
        season_id=1,
        episode_number=1,
        title="Untitled",
        content_group="cg",
        language="en",
        duration_seconds=100,
        status="published",
    )
    defaults.update(kwargs)
    ep = Episode(**defaults)
    ep.artworks = kwargs.get("artworks", [])
    return ep


def test_pick_canonical_prefers_english():
    hi = _episode(language="hi", title="Hindi Title")
    en = _episode(language="en", title="English Title")
    assert _pick_canonical([hi, en]) is en


def test_pick_canonical_falls_back_to_lowest_language_code_when_no_english():
    fr = _episode(language="fr")
    de = _episode(language="de")
    assert _pick_canonical([fr, de]) is de


def test_collapse_episodes_groups_by_content_group_with_language_list():
    en = _episode(content_group="cg1", language="en", title="The Lost Kite", episode_number=1)
    hi = _episode(content_group="cg1", language="hi", title="The Lost Kite", episode_number=1)
    other = _episode(content_group="cg2", language="en", title="Rain on the Roof", episode_number=2)

    entries = _collapse_episodes([en, hi, other])

    assert len(entries) == 2
    cg1 = next(e for e in entries if e["content_group"] == "cg1")
    assert cg1["languages"] == ["en", "hi"]
    assert cg1["title"] == "The Lost Kite"


def test_collapse_episodes_orders_by_episode_number():
    ep2 = _episode(content_group="cg2", episode_number=2)
    ep1 = _episode(content_group="cg1", episode_number=1)

    entries = _collapse_episodes([ep2, ep1])

    assert [e["episode_number"] for e in entries] == [1, 2]


def test_artwork_urls_picks_highest_id_per_kind():
    old = Artwork(id=1, kind="thumbnail", storage_key="artwork/thumbnail/old.jpg", width=640, height=360, size_bytes=1)
    new = Artwork(id=2, kind="thumbnail", storage_key="artwork/thumbnail/new.jpg", width=640, height=360, size_bytes=1)

    urls = artwork_url_map([old, new])

    assert urls == {"thumbnail": "/static/artwork/thumbnail/new.jpg"}


def test_artwork_urls_empty_when_no_artwork():
    assert artwork_url_map([]) == {}
