from fastapi import HTTPException, status

from app.models import Episode, Show


def show_publish_problems(show: Show) -> list[str]:
    problems = []
    if show.section is None:
        problems.append("a section")
    return problems


def episode_publish_problems(episode: Episode) -> list[str]:
    problems = []
    if episode.duration_seconds is None:
        problems.append("a duration")
    if not episode.artworks:
        problems.append("artwork")
    return problems


def check_show_publishable(show: Show) -> None:
    problems = show_publish_problems(show)
    if problems:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Show '{show.title}' needs {' and '.join(problems)} before it can be published.",
        )


def check_episode_publishable(episode: Episode) -> None:
    problems = episode_publish_problems(episode)
    if problems:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Episode '{episode.title}' needs {' and '.join(problems)} before it can be published.",
        )
