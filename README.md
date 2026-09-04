# Peblo TV Mini

Take-home challenge for Peblo (Full-Stack Platform Engineer, Python/FastAPI + React).

CMS upload -> published catalogue -> Netflix-style browse. An internal CMS uploads show/episode content and artwork, the backend validates everything and publishes a catalogue file, and a separate viewer UI reads only that file.

## Stack

FastAPI, PostgreSQL (SQLAlchemy + Alembic), React + TypeScript for the CMS and viewer.

## Status

Part A, phases 1-2 done: schema, migrations, seed script, health check, and JWT auth with editor/admin roles. Nothing is gated behind a role yet since there are no CRUD/admin routes for it to protect - that's next (phase 3). Artwork upload, the publish job, CMS, viewer, and CI are all still to come.

## Running it

Only the backend skeleton + auth run right now.

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

The seed script creates two test accounts: `editor@peblo.dev` / `editor123` and `admin@peblo.dev` / `admin123`. To get a bearer token:

```
curl -X POST http://localhost:8000/auth/login -d "username=editor@peblo.dev&password=editor123"
```

Send it back as `Authorization: Bearer <token>` on anything role-gated once those routes exist.

## Decisions & trade-offs

- `categories` turned out to be a list per show in the real seed data, not a single value like I'd originally modeled. Went with a Postgres array column + GIN index instead of a proper join table - simpler migration, good enough at this data size, would revisit if categories ever need their own metadata.
- The seed data has real issues, all caught by `scripts/seed.py`:
  - `ep_9001` and `ep_0004` both use `content_group="motis-many-lives-s01e02"` + `language="hi"` - breaks the `(content_group, language)` uniqueness rule. The script skips the duplicate and logs it instead of failing the whole load.
  - `ep_0036` is marked published with no artwork.
  - All 8 "Rhyme Rangers" episodes have no section, so that show can never publish as-is.
- Auth is a plain JWT bearer token, not a full OAuth setup - login exchanges email/password for a signed token, `require_role()` is a FastAPI dependency checked per route. Admin implies editor, so an admin token passes an editor-only check too. This is enough for the two internal CMS roles the brief asks for.
- The viewer-facing catalogue endpoints (`GET /catalog`, `GET /catalog/search`) are intentionally public, no login. The brief only defines roles for the CMS side (editor/admin), and a red flag it calls out is the viewer UI touching admin endpoints at all - so keeping the read side open and gating only `/admin/*` and the CRUD routes is the intended split, not an oversight.

More to add here as the rest of the parts get built.
