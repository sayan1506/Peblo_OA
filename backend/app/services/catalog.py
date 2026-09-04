import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Artwork, Episode, Season, Show

REFERENCE_PATH = Path(__file__).resolve().parents[2] / "seed_data" / "reference.json"


def _load_section_order() -> list[str]:
    with open(REFERENCE_PATH, encoding="utf-8") as f:
        return json.load(f)["sections"]


def _pick_canonical(episodes: list[Episode]) -> Episode:
    en_rows = [e for e in episodes if e.language == "en"]
    if en_rows:
        return en_rows[0]
    return min(episodes, key=lambda e: e.language)


def _artwork_urls(artworks: list[Artwork]) -> dict[str, str]:
    by_kind: dict[str, Artwork] = {}
    for art in artworks:
        if art.kind not in by_kind or art.id > by_kind[art.kind].id:
            by_kind[art.kind] = art
    return {kind: f"/static/{art.storage_key}" for kind, art in by_kind.items()}


def _collapse_episodes(episodes: list[Episode]) -> list[dict]:
    groups: dict[str, list[Episode]] = defaultdict(list)
    for ep in episodes:
        groups[ep.content_group].append(ep)

    entries = []
    for content_group, rows in groups.items():
        canonical = _pick_canonical(rows)
        artworks = [a for r in rows for a in r.artworks]
        entries.append(
            {
                "content_group": content_group,
                "episode_number": canonical.episode_number,
                "title": canonical.title,
                "duration_seconds": canonical.duration_seconds,
                "languages": sorted({r.language for r in rows}),
                "artwork": _artwork_urls(artworks),
            }
        )
    entries.sort(key=lambda e: e["episode_number"])
    return entries


def build_catalog(db: Session) -> tuple[dict, int, int]:
    section_order = _load_section_order()

    shows = (
        db.execute(
            select(Show)
            .where(Show.status == "published")
            .options(
                selectinload(Show.artworks),
                selectinload(Show.seasons).selectinload(Season.episodes).selectinload(Episode.artworks),
            )
        )
        .scalars()
        .all()
    )

    shows_by_section: dict[str, list[Show]] = defaultdict(list)
    for show in shows:
        if show.section:
            shows_by_section[show.section].append(show)

    show_count = 0
    episode_count = 0
    sections_out = []

    for section in section_order:
        shows_in_section = sorted(shows_by_section.get(section, []), key=lambda s: s.title)
        if not shows_in_section:
            continue

        shows_payload = []
        for show in shows_in_section:
            seasons = sorted((s for s in show.seasons if s.season_number > 0), key=lambda s: s.season_number)
            trailer_seasons = [s for s in show.seasons if s.season_number == 0]

            seasons_payload = []
            for season in seasons:
                published_eps = [e for e in season.episodes if e.status == "published"]
                if not published_eps:
                    continue
                collapsed = _collapse_episodes(published_eps)
                episode_count += len(collapsed)
                seasons_payload.append({"season_number": season.season_number, "episodes": collapsed})

            trailers_payload = []
            for season in trailer_seasons:
                published_eps = [e for e in season.episodes if e.status == "published"]
                if not published_eps:
                    continue
                collapsed = _collapse_episodes(published_eps)
                episode_count += len(collapsed)
                trailers_payload.extend(collapsed)

            show_count += 1
            shows_payload.append(
                {
                    "id": show.id,
                    "slug": show.slug,
                    "title": show.title,
                    "synopsis": show.synopsis,
                    "categories": show.categories,
                    "artwork": _artwork_urls(show.artworks),
                    "seasons": seasons_payload,
                    "trailers": trailers_payload,
                }
            )

        sections_out.append({"section": section, "shows": shows_payload})

    catalog = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sections": sections_out,
    }
    return catalog, show_count, episode_count
