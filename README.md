# Peblo TV Mini

Take-home challenge for Peblo (Full-Stack Platform Engineer, Python/FastAPI + React).

CMS upload -> published catalogue -> Netflix-style browse. An internal CMS uploads show/episode content and artwork, the backend validates everything and publishes a catalogue file, and a separate viewer UI reads only that file.

## Stack

FastAPI, PostgreSQL (SQLAlchemy + Alembic), React + TypeScript for the CMS and viewer.

## Status

Part A, phases 1-6 done: schema, migrations, seed script, health check, JWT auth with editor/admin roles, full CRUD for shows/seasons/episodes with the three publish-blocking rules enforced, artwork upload with a storage abstraction, an atomic publish job, and the public `/catalog` + `/catalog/search` read endpoints. The validation report, CMS, viewer, and CI are still to come.

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

Publishing needs an admin token (editor is not enough):

```
curl -X POST http://localhost:8000/admin/catalog/publish -H "Authorization: Bearer <admin-token>"
```

Writes `backend/storage/catalog.json` and records a `publish_runs` row either way, success or failure.

`/catalog` and `/catalog/search` are the two public, unauthenticated routes - no token needed:

```
curl http://localhost:8000/catalog
curl "http://localhost:8000/catalog/search?q=kite&language=en"
curl "http://localhost:8000/catalog/search?category=adventure&section=featured"
```

Both 404 with a plain message until the first successful publish.

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
- Publishing is made atomic in `LocalStorage.put` itself, not in the publish job: write to a temp file in the same directory, then `os.replace` it over the real key. `os.replace` is an atomic rename on the same filesystem, so a reader of `catalog.json` never sees a half-written file, and a crash mid-write leaves the previous good file untouched (verified with a test that forces the rename to fail and confirms the original content survives). This lives in the storage class rather than the publish job so a future `R2Storage` - where a single `PutObject` call is already atomic - doesn't need it at all.
- `PublishRun` gained a `detail` column (new migration) to record *why* a run failed, not just that it did. The run row is inserted with `outcome="running"` and committed before the catalogue is built, so a crash mid-build leaves a "running" row behind instead of nothing.
- Publish rebuilds the whole catalogue from the current DB state every time and overwrites the same file key, so it's naturally idempotent - running it twice with no data changes produces byte-identical output (verified in testing).
- Season 0 (trailers) is kept in the catalogue, just split into its own `trailers` array per show instead of `seasons`. The brief's rule is that trailers can't show up as a normal season in the viewer, not that they should disappear - they're still real published content someone uploaded.
- Sections in the catalogue are ordered by `reference.json`'s `sections` list (`featured, series, minisodes, songs`), not alphabetically - that's presumably the intended browse order.
- `content_group` collapsing picks one canonical title/duration per group - preferring the `en` row if one exists, else whichever language code sorts first. Nothing in the seed data has language variants disagreeing on title, but the schema doesn't guarantee that, so this is a deliberate tie-breaker rather than an assumption.
- No pagination inside the catalogue file - at 8 shows / ~95 episodes it's trivially small. Would need addressing at real scale; noted as a known limit rather than solved now.
- `/catalog` and `/catalog/search` read only the published `catalog.json` through the storage abstraction, never the database - that's the actual reason the publish step exists. It also means search is only as fresh as the last publish; editing a show doesn't change what a viewer sees until someone re-publishes. Serving a pre-built file instead of querying live also means the viewer is never affected by a slow or down database, and never sees an editor's half-finished edit.
- Search returns per-episode rows, not per-show - a search for "kite" should surface the specific episode, not just its parent show, with enough show context in each row to render without a second lookup. `q` matches show title, episode title, and category (substring); `category`/`language`/`section` are exact-match filters, and all four compose with AND.
- Trailers are reachable through plain `q` search even though they're excluded from the normal season list in a show's detail view - the brief only asks that trailers not show up as a normal season, not that they be unsearchable.
- Where search actually breaks at this design's current scale: today it's a full in-memory linear scan over every episode, re-parsing the whole JSON file per request - fine at ~95 episodes, not worth optimizing yet. The first real cost at higher volume is the re-parse-per-request, not the scan itself; caching the parsed catalogue in memory (invalidated on republish) would remove that before the linear scan becomes the bottleneck. Past that, `q` matching would need a real index (Postgres `tsvector` on the source tables, or an inverted index built at publish time) rather than a per-request scan.

More to add here as the rest of the parts get built.
