# Peblo TV Mini

A miniature streaming platform: a CMS for uploading show/episode content and artwork, a FastAPI + PostgreSQL backend that publishes a catalogue, and a Netflix-style viewer UI that browses it.

**Stack:** FastAPI, PostgreSQL, React + TypeScript

## Decisions & trade-offs (Phase A1)

- **Postgres port conflict.** A native Postgres service was already bound to `5432` on the dev machine. Mapped the docker-compose `db` service to host port `5433` instead of fighting the existing install; `.env` / `.env.example` reflect this.
- **`.env` location.** Alembic runs from `backend/`, so `.env` needs to live in `backend/.env` (not the repo root) for `pydantic-settings` to pick it up. Cost some time tracking down a silent fallback to default credentials.
- **`categories` schema.** The model started as a single `category: str` column, matching an initial guess at the shape. Once `seed_shows.json` arrived, `categories` turned out to be a list per show/episode. Switched to a Postgres `ARRAY(String)` column with a GIN index rather than a many-to-many join table — simpler migration, adequate for this data size, revisit if categories ever need their own metadata.
- **Seed data issues found** (surfaced by `scripts/seed.py`, feeds the validation report in a later phase):
  - `ep_9001` and `ep_0004` share `content_group="motis-many-lives-s01e02"` and `language="hi"` — violates the `(content_group, language)` uniqueness rule. The script skips the duplicate and logs it rather than failing the whole load.
  - `ep_0036` is marked `published` with `artwork_available: []` — violates "no publish without artwork."
  - All 8 "Rhyme Rangers" episodes have `section: null` — the show can never publish until a section is set.

More details on setup and design decisions will be added as the project develops.
