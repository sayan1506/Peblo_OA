# Peblo TV Mini

Take-home challenge for Peblo (Full-Stack Platform Engineer, Python/FastAPI + React).

CMS upload -> published catalogue -> Netflix-style browse. An internal CMS uploads show/episode content and artwork, the backend validates everything and publishes a catalogue file, and a separate viewer UI reads only that file.

## Stack

FastAPI, PostgreSQL (SQLAlchemy + Alembic), React + TypeScript for the CMS and viewer.

## Status

Backend skeleton only so far (Part A, phase 1): schema, migrations, seed script, health check. CRUD/roles, artwork upload, the publish job, CMS, viewer, and CI are still to come.

## Running it

Only the backend skeleton runs right now.

```
docker compose up -d db
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
python scripts/seed.py
uvicorn app.main:app --reload
```

Postgres is mapped to host port 5433, not 5432 - there's already a native Postgres install on this machine sitting on 5432, so the compose db needed a different port. `.env` needs to live inside `backend/`, not the repo root, since that's where Alembic and uvicorn actually run from.

## Decisions & trade-offs

- `categories` turned out to be a list per show in the real seed data, not a single value like I'd originally modeled. Went with a Postgres array column + GIN index instead of a proper join table - simpler migration, good enough at this data size, would revisit if categories ever need their own metadata.
- The seed data has real issues, all caught by `scripts/seed.py`:
  - `ep_9001` and `ep_0004` both use `content_group="motis-many-lives-s01e02"` + `language="hi"` - breaks the `(content_group, language)` uniqueness rule. The script skips the duplicate and logs it instead of failing the whole load.
  - `ep_0036` is marked published with no artwork.
  - All 8 "Rhyme Rangers" episodes have no section, so that show can never publish as-is.

More to add here as the rest of the parts get built.
