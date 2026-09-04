import json

from fastapi import APIRouter, HTTPException, status

from app.storage import get_storage

router = APIRouter(tags=["catalog"])


def _load_catalog() -> dict:
    storage = get_storage()
    try:
        data = storage.get("catalog.json")
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No catalogue has been published yet.",
        )
    return json.loads(data)


def _episode_groups(show: dict) -> list[dict]:
    groups = list(show["seasons"])
    if show["trailers"]:
        groups.append({"season_number": 0, "episodes": show["trailers"]})
    return groups


def _matches_query(q: str, show: dict, ep: dict) -> bool:
    q_lower = q.lower()
    if q_lower in show["title"].lower():
        return True
    if q_lower in ep["title"].lower():
        return True
    return any(q_lower in cat.lower() for cat in show["categories"])


def _result_row(section: str, show: dict, ep: dict) -> dict:
    return {
        "section": section,
        "show_id": show["id"],
        "show_slug": show["slug"],
        "show_title": show["title"],
        "content_group": ep["content_group"],
        "episode_title": ep["title"],
        "languages": ep["languages"],
        "duration_seconds": ep["duration_seconds"],
        "artwork": ep["artwork"] or show["artwork"],
    }


@router.get("/catalog")
def get_catalog():
    return _load_catalog()


@router.get("/catalog/search")
def search_catalog(
    q: str | None = None,
    category: str | None = None,
    language: str | None = None,
    section: str | None = None,
):
    catalog = _load_catalog()

    results = []
    for section_entry in catalog["sections"]:
        if section and section_entry["section"] != section:
            continue
        for show in section_entry["shows"]:
            if category and category not in show["categories"]:
                continue
            for group in _episode_groups(show):
                for ep in group["episodes"]:
                    if language and language not in ep["languages"]:
                        continue
                    if q and not _matches_query(q, show, ep):
                        continue
                    results.append(_result_row(section_entry["section"], show, ep))

    return {"items": results, "total": len(results)}
