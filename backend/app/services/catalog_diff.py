EPISODE_DIFF_FIELDS = ("title", "duration_seconds", "languages", "artwork")


def _flatten_shows(catalog: dict) -> dict[str, dict]:
    """slug -> show dict, across every section."""
    return {show["slug"]: show for section in catalog.get("sections", []) for show in section["shows"]}


def _flatten_episodes(show: dict) -> dict[str, dict]:
    """content_group -> episode dict, across every season plus trailers."""
    result = {ep["content_group"]: ep for season in show.get("seasons", []) for ep in season["episodes"]}
    result.update({ep["content_group"]: ep for ep in show.get("trailers", [])})
    return result


def diff_catalogs(old: dict | None, new: dict) -> dict:
    """Compares a not-yet-published catalog build against the currently
    published one (or nothing, if this would be the first publish)."""
    old_shows = _flatten_shows(old) if old else {}
    new_shows = _flatten_shows(new)

    shows_added = [{"slug": slug, "title": show["title"]} for slug, show in new_shows.items() if slug not in old_shows]
    shows_removed = [{"slug": slug, "title": show["title"]} for slug, show in old_shows.items() if slug not in new_shows]

    episodes_added = []
    episodes_removed = []
    episodes_changed = []

    for slug, new_show in new_shows.items():
        old_show = old_shows.get(slug)
        old_eps = _flatten_episodes(old_show) if old_show else {}
        new_eps = _flatten_episodes(new_show)

        for content_group, ep in new_eps.items():
            if content_group not in old_eps:
                episodes_added.append({"show_slug": slug, "content_group": content_group, "title": ep["title"]})

        for content_group, ep in old_eps.items():
            if content_group not in new_eps:
                episodes_removed.append({"show_slug": slug, "content_group": content_group, "title": ep["title"]})

        for content_group, new_ep in new_eps.items():
            old_ep = old_eps.get(content_group)
            if old_ep is None:
                continue
            changed_fields = [f for f in EPISODE_DIFF_FIELDS if old_ep.get(f) != new_ep.get(f)]
            if changed_fields:
                episodes_changed.append(
                    {
                        "show_slug": slug,
                        "content_group": content_group,
                        "title": new_ep["title"],
                        "changed_fields": changed_fields,
                    }
                )

    return {
        "shows_added": shows_added,
        "shows_removed": shows_removed,
        "episodes_added": episodes_added,
        "episodes_removed": episodes_removed,
        "episodes_changed": episodes_changed,
    }
