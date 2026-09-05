import json
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Season, Show
from app.services.validation import episode_publish_problems, show_publish_problems
from app.storage import get_storage

SEED_ISSUES_KEY = "seed_data_issues.json"


def _load_seed_issues() -> list[dict]:
    storage = get_storage()
    try:
        data = storage.get(SEED_ISSUES_KEY)
    except FileNotFoundError:
        return []
    return json.loads(data)["issues"]


def build_validation_report(db: Session) -> dict:
    shows = (
        db.execute(select(Show).options(selectinload(Show.seasons).selectinload(Season.episodes)))
        .scalars()
        .all()
    )

    blocking_shows = []
    blocking_episodes = []

    for show in shows:
        problems = show_publish_problems(show)
        if problems:
            blocking_shows.append(
                {
                    "id": show.id,
                    "slug": show.slug,
                    "title": show.title,
                    "status": show.status,
                    "problems": problems,
                }
            )

        for season in show.seasons:
            for episode in season.episodes:
                ep_problems = episode_publish_problems(episode)
                if ep_problems:
                    blocking_episodes.append(
                        {
                            "id": episode.id,
                            "content_group": episode.content_group,
                            "title": episode.title,
                            "show_slug": show.slug,
                            "status": episode.status,
                            "problems": ep_problems,
                        }
                    )

    seed_issues = _load_seed_issues()

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "blocking": {
            "shows": blocking_shows,
            "episodes": blocking_episodes,
        },
        "seed_issues": seed_issues,
        "summary": {
            "blocking_shows": len(blocking_shows),
            "blocking_episodes": len(blocking_episodes),
            "seed_issues": len(seed_issues),
        },
    }
