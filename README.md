# Peblo TV Mini

Take-home challenge for Peblo (Full-Stack Platform Engineer, Python/FastAPI + React).

CMS upload -> published catalogue -> Netflix-style browse. An internal CMS uploads show/episode content and artwork, the backend validates everything and publishes a catalogue file, and a separate viewer UI reads only that file.

## Stack

FastAPI, PostgreSQL (SQLAlchemy + Alembic), React + TypeScript for the CMS and viewer.

## Status

Part A, phases 1-4 done: schema, migrations, seed script, health check, JWT auth with editor/admin roles, full CRUD for shows/seasons/episodes with the three publish-blocking rules enforced, and artwork upload with a storage abstraction. The publish job, CMS, viewer, and CI are still to come.

## Running it

Backend skeleton + auth + CRUD run right now.

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

Send it back as `Authorization: Bearer <token>` on everything under `/shows`, `/seasons`, `/episodes`, `/artwork` - all of it is role-gated now, reads included.

Quick smoke test once you have a token:

```
curl http://localhost:8000/shows -H "Authorization: Bearer <token>"
curl -X POST http://localhost:8000/shows -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"title":"Test Show","slug":"test-show","section":"series","categories":["music"]}'
curl -X POST "http://localhost:8000/artwork?kind=poster&show_id=1" -H "Authorization: Bearer <token>" \
  -F "file=@seed_data/assets/poster_good.jpg"
```

Uploaded files land in `backend/storage/` locally and are served back from `/static/...`.

## Decisions & trade-offs

- `categories` turned out to be a list per show in the real seed data, not a single value like I'd originally modeled. Went with a Postgres array column + GIN index instead of a proper join table - simpler migration, good enough at this data size, would revisit if categories ever need their own metadata.
- The seed data has real issues, all caught by `scripts/seed.py`:
  - `ep_9001` and `ep_0004` both use `content_group="motis-many-lives-s01e02"` + `language="hi"` - breaks the `(content_group, language)` uniqueness rule. The script skips the duplicate and logs it instead of failing the whole load.
  - `ep_0036` is marked published with no artwork.
  - All 8 "Rhyme Rangers" episodes have no section, so that show can never publish as-is.
- Auth is a plain JWT bearer token, not a full OAuth setup - login exchanges email/password for a signed token, `require_role()` is a FastAPI dependency checked per route. Admin implies editor, so an admin token passes an editor-only check too. This is enough for the two internal CMS roles the brief asks for.
- The viewer-facing catalogue endpoints (`GET /catalog`, `GET /catalog/search`, not built yet) are the only ones meant to be public. Every route under `/shows`, `/seasons`, `/episodes` - including plain list/read - requires an editor token. This is CMS-internal content management, not public data, so there's no reason to leave reads open just because they're non-mutating.
- The `(content_group, language)` uniqueness check and the "no publish without artwork/duration" / "no publish without section" rules are enforced at the API layer (422/409 with a real message), not just left to the DB constraint from phase 1 to surface as a raw error. Verified this stays consistent with what `scripts/seed.py` already flags by re-running the seed data's known bad rows (the Rhyme Rangers show, episode `ep_0036`) through the live API and getting the same rejections.
- Show delete cascades to its seasons/episodes/artwork (DB-level cascade from phase 1). Left as-is at the API level since there's no reason to change the data model for this; a confirmation step belongs in the CMS UI (Part B), not the API contract.
- Artwork validation checks aspect ratio (2% tolerance, tight on purpose to catch a mis-crop like `poster_wrong_ratio.jpg`'s swapped ratio) and pixel dimensions (15% tolerance around the target) as separate checks, not aspect + file size alone. `banner_too_big.png` is the reason: it's the right 16:9 shape and only 13.8 KB, well under the 200 KB ceiling, but it's 2x the target resolution. Checking just aspect + size would let it through by accident.
- `reference.json` doesn't say whether artwork accepts PNG in addition to JPG - `banner_too_big.png` is itself a PNG. Defaulted to accepting whatever Pillow can decode rather than allowlisting an extension.
- No `banner_good.jpg` exists in the provided assets, so there's no local file to run a banner happy-path test against end-to-end. Covered that gap with a unit test on `validate_artwork("banner", ...)` using an in-memory 1280x720 image instead.
- Storage is behind a small `Storage` ABC (`put`/`delete`) with a `LocalStorage` implementation chosen by `settings.storage_backend`. Swapping in something like R2 later means adding one new class and one branch in the factory - no router, model, or validation code changes.
- Serving uploaded files back is a plain `StaticFiles` mount at `/static`, not a proxied `GET /artwork/{id}/file` route. Simpler for local dev; if a remote backend needs signed URLs later, that's the point where a dedicated route would replace the mount.

More to add here as the rest of the parts get built.
