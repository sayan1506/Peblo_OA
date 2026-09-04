"""Loads seed_data/seed_shows.json into the database.

seed_shows.json is a flat list of episode rows; each row repeats its show's
fields (title, section, categories, synopsis). This groups rows by show slug
and season_number to build the shows -> seasons -> episodes hierarchy.

Idempotent: truncates the tables it populates before inserting.
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text

from app.db import Base, SessionLocal, engine
from app.dependencies.security import hash_password
from app.models import Episode, Season, Show, User
from app.storage import get_storage

SEED_FILE = Path(__file__).resolve().parents[1] / "seed_data" / "seed_shows.json"
SEED_ISSUES_KEY = "seed_data_issues.json"


def load_rows() -> list[dict]:
    with open(SEED_FILE, encoding="utf-8") as f:
        return json.load(f)


def seed():
    Base.metadata.create_all(bind=engine)

    rows = load_rows()
    issues: list[str] = []
    # Rows dropped entirely during load can never be re-derived from the DB
    # afterward (they were never inserted) - unlike a missing-section or
    # missing-artwork issue, which the validation report can always re-check
    # live against whatever's actually in the DB. Persisted separately so
    # GET /admin/validation-report has something durable to read, instead of
    # this only ever reaching stdout.
    dropped_duplicates: list[dict] = []

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
                detail = (
                    f"{episode_id}: duplicate (content_group={content_group!r}, "
                    f"language={language!r}) already used by "
                    f"{seen_content_group_lang[group_lang_key]} - skipping this row, "
                    "(content_group, language) must be unique"
                )
                issues.append(detail)
                dropped_duplicates.append(
                    {
                        "type": "duplicate_content_group_language",
                        "episode_id": episode_id,
                        "content_group": content_group,
                        "language": language,
                        "kept_episode_id": seen_content_group_lang[group_lang_key],
                        "detail": detail,
                    }
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

        seed_users(db)
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

    write_seed_issues(dropped_duplicates)

    print("\nSeeded users: editor@peblo.dev / editor123, admin@peblo.dev / admin123")


def write_seed_issues(dropped_duplicates: list[dict]) -> None:
    # A dropped duplicate row is never in the DB, so unlike a missing-section
    # or missing-artwork problem, the validation report can't rediscover it
    # by re-checking live state - it has to be captured here, at seed time.
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "issues": dropped_duplicates,
    }
    storage = get_storage()
    storage.put(SEED_ISSUES_KEY, json.dumps(payload, indent=2).encode("utf-8"), "application/json")


def seed_users(db):
    db.execute(text("TRUNCATE TABLE users RESTART IDENTITY CASCADE"))
    db.add(User(email="editor@peblo.dev", hashed_password=hash_password("editor123"), role="editor"))
    db.add(User(email="admin@peblo.dev", hashed_password=hash_password("admin123"), role="admin"))
    db.commit()


if __name__ == "__main__":
    seed()
