# Peblo TV Mini

Take-home challenge for Peblo (Full-Stack Platform Engineer, Python/FastAPI + React).

CMS upload -> published catalogue -> Netflix-style browse. An internal CMS uploads show/episode content and artwork, the backend validates everything and publishes a catalogue file, and a separate viewer UI reads only that file.

## Stack

FastAPI, PostgreSQL (SQLAlchemy + Alembic), React + TypeScript for the CMS and viewer.

## Status

Backend (Part A) is complete: schema, migrations, seed script, health check, JWT auth with editor/admin roles, full CRUD for shows/seasons/episodes with the three publish-blocking rules enforced, artwork upload with a storage abstraction, an atomic publish job, the public `/catalog` + `/catalog/search` read endpoints, a live validation report, and a test suite (49 tests) covering the riskiest logic.

CMS (Part B) is underway: the project skeleton, login against the real auth endpoint, and an authenticated API client are wired up. List/form UI, artwork upload, and the publish page are still to come. The viewer and CI are still to come.

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

`GET /admin/validation-report` needs an editor token (not admin-only, unlike publish) - it's exactly what an editor needs to know what to fix:

```
curl http://localhost:8000/admin/validation-report -H "Authorization: Bearer <token>"
```

Tests:

```
.\venv\Scripts\python.exe -m pytest tests/ -v
```

49 tests. Most need no DB at all; the three in `test_role_enforcement_integration.py` need `docker compose up -d db` and skip cleanly (not fail) if it's not reachable.

### CMS

```
cd cms
npm install
copy .env.example .env
npm run dev
```

Runs at `http://localhost:5173`. The backend must already be running on `http://localhost:8000` (CORS is set up for this dev origin - see the backend steps above). Log in with either seeded account; the JWT is stored in `localStorage` and attached to every request.

## Decisions & trade-offs

- **Schema & seed data:** `categories` is a Postgres array column + GIN index, not a join table - real seed data has it as a list per show, and this is simpler at this scale. `scripts/seed.py` catches real data issues: `ep_9001`/`ep_0004` collide on `(content_group, language)` (duplicate skipped and logged), `ep_0036` is published with no artwork, all 8 "Rhyme Rangers" episodes have no section.
- **Auth:** Plain JWT bearer token (`require_role()` dependency, admin implies editor) - enough for the two internal CMS roles the brief asks for.
- **CRUD & validation:** Every route under `/shows`, `/seasons`, `/episodes` is editor-gated, including plain reads - this is CMS-internal content management, not public data. Publish-blocking rules (uniqueness, missing artwork/duration, missing section) are enforced at the API layer as 422/409 with real messages, not left as raw DB errors. Show delete cascades to seasons/episodes/artwork at the DB level.
- **Artwork upload:** Storage is behind a `Storage` ABC (`LocalStorage` today, swappable via `settings.storage_backend`); files are served back through a plain `/static` mount. Artwork validation checks aspect ratio (2% tolerance) and pixel dimensions (15% tolerance) separately, not aspect + file size alone - `banner_too_big.png` is right-shape and under the size ceiling but 2x the target resolution, so a combined check would miss it. Accepts anything Pillow can decode since `reference.json` doesn't specify allowed formats.
- **Publish job:** Atomicity lives in `LocalStorage.put` (temp file + `os.replace`), not the publish job, so a future remote backend with atomic writes needs no equivalent. Publish is naturally idempotent (rebuilds the full catalogue each run). Season 0 (trailers) gets its own `trailers` array per show; sections order per `reference.json`'s list; `content_group` language variants collapse to one canonical row, preferring `en`. No pagination in the catalogue file - trivial at ~95 episodes.
- **Catalog reads:** `/catalog` and `/catalog/search` read only the published `catalog.json`, never the DB - only `/catalog*` are public, everything else stays editor-gated. Search is per-episode, not per-show: `q` is a substring match on show/episode title/category, `category`/`language`/`section` are exact filters, all AND together. Today it's a full linear scan re-parsed per request - fine at this size, caching the parsed catalogue would be the first fix at scale.
- **Validation report:** The report and the CRUD publish checks share the same rule functions (`show_publish_problems`/`episode_publish_problems`), so they can't drift apart. `GET /admin/validation-report` is editor-gated, not admin-only, since it's what an editor needs to fix issues before publishing. A dropped duplicate seed row can't be re-derived from the DB later, so it's persisted separately to `storage/seed_data_issues.json`.
- **Tests:** Coverage is prioritized, not exhaustive - publish atomicity, `content_group` collapsing, and artwork edge cases already had unit tests from the phases that introduced them; the one real gap was role enforcement, closed with unit tests on `get_current_user`/`require_role` plus a few `TestClient` checks against the dev DB. Skipped a full 401/403 matrix across every CRUD route and a transactional test-DB fixture - not worth building for this scope.
- **CMS auth:** Token stored in plain `localStorage`, not an httpOnly cookie - consistent with this being a bearer-token API, not a session-cookie one. An XSS on this app could read the token; a real production CMS would mitigate that with an httpOnly cookie and a backend session instead. The role is decoded straight out of the JWT payload (no `/me` call needed); a shared `apiFetch` wrapper attaches the token and surfaces the backend's real `detail` message on errors rather than a generic one, since the CRUD/artwork forms need that exact wording.

More to add here as Parts B, C, D, and E get built.
