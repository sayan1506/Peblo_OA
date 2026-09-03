"""Loads seed_data/seed_shows.json into the database.

seed_shows.json is a flat list of episode rows; each row repeats its show's
fields (title, section, categories, synopsis). This groups rows by show slug
and season_number to build the shows -> seasons -> episodes hierarchy.

Idempotent: truncates the tables it populates before inserting.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text

from app.db import Base, SessionLocal, engine
from app.models import Episode, Season, Show

SEED_FILE = Path(__file__).resolve().parents[1] / "seed_data" / "seed_shows.json"


def load_rows() -> list[dict]:
    with open(SEED_FILE, encoding="utf-8") as f:
        return json.load(f)


def seed():
    Base.metadata.create_all(bind=engine)

    rows = load_rows()
    issues: list[str] = []

    db = SessionLocal()
    try:
        db.execute(text("TRUNCATE TABLE artworks, episodes, seasons, shows RESTART IDENTITY CASCADE"))
        db.commit()

        shows_by_slug: dict[str, Show] = {}
        seasons_by_key: dict[tuple[str, int], Season] = {}
        seen_content_group_lang: dict[tuple[str, str], str] = {}

        for row in rows:
            slug = row["slug"]
            episode_id = row["episode_id"]

            if row.get("section") is None:
                issues.append(
                    f"{episode_id}: show '{row['show_title']}' has no section, "
                    "cannot be published until one is set"
                )

            show = shows_by_slug.get(slug)
            if show is None:
                show = Show(
                    slug=slug,
                    title=row["show_title"],
                    synopsis=row.get("synopsis"),
                    section=row.get("section"),
                    categories=row.get("categories", []),
                    status="draft",
                )
                db.add(show)
                db.flush()
                shows_by_slug[slug] = show

            season_key = (slug, row["season_number"])
            season = seasons_by_key.get(season_key)
            if season is None:
                season = Season(show_id=show.id, season_number=row["season_number"])
                db.add(season)
                db.flush()
                seasons_by_key[season_key] = season

            content_group = row["content_group"]
            language = row["language"]
            group_lang_key = (content_group, language)

            if group_lang_key in seen_content_group_lang:
                issues.append(
                    f"{episode_id}: duplicate (content_group={content_group!r}, "
                    f"language={language!r}) already used by "
                    f"{seen_content_group_lang[group_lang_key]} - skipping this row, "
                    "(content_group, language) must be unique"
                )
                continue
            seen_content_group_lang[group_lang_key] = episode_id

            status = row.get("status", "draft")
            artwork_available = row.get("artwork_available", [])
            duration = row.get("duration_seconds")

            if status == "published" and (not artwork_available or duration is None):
                issues.append(
                    f"{episode_id}: marked published but missing "
                    f"{'artwork' if not artwork_available else 'duration'} - "
                    "cannot be published without both"
                )

            episode = Episode(
                season_id=season.id,
                episode_number=row["episode_number"],
                title=row["episode_title"],
                content_group=content_group,
                language=language,
                duration_seconds=duration,
                status=status,
            )
            db.add(episode)

        db.commit()
    finally:
        db.close()

    print(f"Loaded {len(rows)} rows into {len(shows_by_slug)} shows, "
          f"{len(seasons_by_key)} seasons, {len(seen_content_group_lang)} episodes.")

    if issues:
        print(f"\n{len(issues)} data issue(s) found:")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("\nNo data issues found.")


if __name__ == "__main__":
    seed()
