from fastapi import HTTPException, status

from app.models import Episode, Show


def check_show_publishable(show: Show) -> None:
    if show.section is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Show '{show.title}' needs a section before it can be published.",
        )


def check_episode_publishable(episode: Episode) -> None:
    problems = []
    if episode.duration_seconds is None:
        problems.append("a duration")
    if not episode.artworks:
        problems.append("artwork")
    if problems:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Episode '{episode.title}' needs {' and '.join(problems)} before it can be published.",
        )
