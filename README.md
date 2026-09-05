# Peblo TV Mini

Take-home challenge for Peblo (Full-Stack Platform Engineer, Python/FastAPI + React).

CMS upload -> published catalogue -> Netflix-style browse. An internal CMS uploads show/episode content and artwork, the backend validates everything and publishes a catalogue file, and a separate viewer UI reads only that file.

## Stack

FastAPI, PostgreSQL (SQLAlchemy + Alembic), React + TypeScript for the CMS and viewer.

## Status

Backend (Part A) is complete: schema, migrations, seed script, health check, JWT auth with editor/admin roles, full CRUD for shows/seasons/episodes with the three publish-blocking rules enforced, artwork upload with a storage abstraction, an atomic publish job, the public `/catalog` + `/catalog/search` read endpoints, a live validation report, a paginated publish-run history endpoint (added during Part B once the CMS needed it), and a test suite (51 tests) covering the riskiest logic.

CMS (Part B) is complete: the project skeleton with login/JWT/authenticated API client, a shows list (search, section/status/category filters, pagination, URL-persisted state), a show detail page with a seasons -> episodes drill-down, create/edit forms for shows, seasons (add-only), and episodes with real backend validation messages surfaced inline, a three-slot artwork uploader (poster/banner/thumbnail) on the show/episode edit forms with live preview and real validation errors, a publish page (validation report, a publish button gated by role and blocking issues, and paginated run history backed by a new `GET /admin/publish-runs` endpoint), and a full loading/empty/error/permission-denied state sweep across every view.

Viewer (Part C) is in progress: Phase C1 (project skeleton + data layer) is complete - a separate `viewer/` app with zero auth/token concept, reading only the two public `/catalog` and `/catalog/search` routes. `fetchCatalog`/`searchCatalog` wrap a shared `CatalogError`-throwing fetch helper; TanStack Query hooks (`useCatalog`, `useSearch`) sit on top; three routes (`/`, `/shows/:slug`, `/search`) each render the real fetched data as raw JSON for now, proving the data layer before C2+ builds real UI on it. CI is still to come.

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
uvicorn app.main:app --reload --port 8010
```

Postgres is mapped to host port 5433, not 5432 - there's already a native Postgres install on this machine sitting on 5432, so the compose db needed a different port. `.env` needs to live inside `backend/`, not the repo root, since that's where Alembic and uvicorn actually run from. The API itself runs on port **8010**, not the more typical 8000 - this machine has a stale/ghost process permanently squatting on 8000 (outside this project, unrelated to anything here), so 8010 is the default for local dev and Docker alike.

The seed script creates two test accounts: `editor@peblo.dev` / `editor123` and `admin@peblo.dev` / `admin123`. To get a bearer token:

```
curl -X POST http://localhost:8010/auth/login -d "username=editor@peblo.dev&password=editor123"
```

Send it back as `Authorization: Bearer <token>` on everything under `/shows`, `/seasons`, `/episodes`, `/artwork` - all of it is role-gated now, reads included.

Quick smoke test once you have a token:

```
curl http://localhost:8010/shows -H "Authorization: Bearer <token>"
curl -X POST http://localhost:8010/shows -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"title":"Test Show","slug":"test-show","section":"series","categories":["music"]}'
curl -X POST "http://localhost:8010/artwork?kind=poster&show_id=1" -H "Authorization: Bearer <token>" \
  -F "file=@seed_data/assets/poster_good.jpg"
```

Uploaded files land in `backend/storage/` locally and are served back from `/static/...`.

Publishing needs an admin token (editor is not enough):

```
curl -X POST http://localhost:8010/admin/catalog/publish -H "Authorization: Bearer <admin-token>"
```

Writes `backend/storage/catalog.json` and records a `publish_runs` row either way, success or failure.

`/catalog` and `/catalog/search` are the two public, unauthenticated routes - no token needed:

```
curl http://localhost:8010/catalog
curl "http://localhost:8010/catalog/search?q=kite&language=en"
curl "http://localhost:8010/catalog/search?category=adventure&section=featured"
```

Both 404 with a plain message until the first successful publish.

`GET /admin/validation-report` needs an editor token (not admin-only, unlike publish) - it's exactly what an editor needs to know what to fix:

```
curl http://localhost:8010/admin/validation-report -H "Authorization: Bearer <token>"
```

Tests:

```
.\venv\Scripts\python.exe -m pytest tests/ -v
```

51 tests. Most need no DB at all; the five in `test_role_enforcement_integration.py` need `docker compose up -d db` and skip cleanly (not fail) if it's not reachable.

### CMS

```
cd cms
npm install
copy .env.example .env
npm run dev
```

Runs at `http://localhost:5173`. The backend must already be running on `http://localhost:8010` (CORS is set up for this dev origin - see the backend steps above). Log in with either seeded account; the JWT is stored in `localStorage` and attached to every request.

### Viewer

```
cd viewer
npm install
copy .env.example .env
npm run dev
```

Runs at `http://localhost:5174` (pinned in `viewer/vite.config.ts`, and CORS on the backend allows this origin alongside the CMS's `5173`). No login, no token - this app only ever calls the two public `/catalog` and `/catalog/search` routes. If `backend/storage/catalog.json` still has `sections: []`, publish something for real from the CMS first (log in as admin, resolve any blocking issues on a show/episode, hit Publish) or there's nothing for the viewer to show.

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
- **CMS shows/episodes list:** Filter and page state live in the URL (`useSearchParams`), not component state, so a refresh or shared link reproduces the same view. There's no `GET /seasons/{id}/episodes`, so a show's episodes are fetched once (`show_id` filter) and grouped by `season_id` client-side - fine at seed-data scale, would need real pagination per season at scale. Filter dropdown values (`sections`/`categories`/`languages`) are mirrored from `reference.json` into a static `constants/reference.ts` rather than fetched, since no endpoint exposes them - if `reference.json` changes, this file needs a manual update too.
- **CMS forms:** Seasons only get a create form, not an edit form - `SeasonCreate` is just `{ season_number }` and there's no `PATCH /seasons/{id}` on the backend, so a season's number is fixed once added. A show's slug is editable on create only (`ShowUpdate` has no slug field), so the edit form disables that field with an explanatory note instead of silently dropping the value. Every mutation surfaces the real `ApiError` message inline via a shared `FormError` component, so a 422 (missing section, missing duration/artwork) or 409 (duplicate slug, duplicate content_group+language) reads exactly as the backend worded it. Successful create/edit invalidates the relevant queries, so the shows list and show detail views update without a manual refresh.
- **CMS artwork upload:** Slots only render on the show/episode **edit** forms, not create - `POST /artwork` requires an existing `show_id`/`episode_id` to attach to. There's no read endpoint for artwork (`ShowRead`/`EpisodeRead` don't include it, and there's no `GET /artwork`), so the CMS can only show what was uploaded in the current page visit - navigating away and back resets the slots, which is a real gap in what the backend exposes, not a bug. Re-uploading the same kind doesn't replace anything either (the backend always inserts a new row), so uploading twice leaves two rows - not guarded against in the UI beyond the single-upload flow. An episode's publish check only requires *any one* artwork row (`if not episode.artworks`), not all three kinds, so the three-slot UI is editorial completeness, not a per-slot enforcement the backend checks.
- **CMS publish page:** The backend had no way to list past publish runs - `POST /admin/catalog/publish` only ever returned the run it had just triggered - so a new `GET /admin/publish-runs` (editor-gated, paginated, same shape as the shows list) was added to the backend rather than faking history in `localStorage`, since real cross-session/cross-device history is what "run history" actually means and the `publish_runs` table already had every column needed. It's editor-gated, not admin-only, for the same reason the validation report is: an editor needs to confirm their fix actually got published, even though they can't trigger one. The publish button itself is hidden (not just disabled) for an editor, with a one-line explanation of the role restriction; for an admin it's disabled with the exact blocking-issue count until the validation report clears to zero.
- **Viewer skeleton:** A genuinely separate app from the CMS, not a route inside it - it has no `auth/` directory, no token storage, no `Authorization` header anywhere, since it only ever calls the two unauthenticated `/catalog*` routes. Show detail routes on `slug` (`/shows/:slug`), not `id` - the catalogue already carries `slug` on every show and a slug-based URL is the natural public pattern - and the matching show is found client-side within the already-fetched catalogue rather than a second network call, since no per-show public endpoint exists. Dependency versions are pinned to match the CMS's where there's no reason to diverge (same React/Vite/TanStack Query/react-router-dom majors).
- **CMS UI states:** Auditing every view against the four required states surfaced a real bug, not just a gap: `ShowFormPage`/`EpisodeFormPage` checked `existing.isLoading` in edit mode but never `existing.isError`, so opening an edit URL for a deleted or bad id (a stale bookmark, a typo'd id) silently rendered a blank form instead of the real 404 - fixed with the same `ErrorState` + retry pattern the rest of the app already uses. Added a dedicated `PermissionDeniedState` component (amber, not the alarming red of `ErrorState`) rather than leaving the publish page's role-restriction message as an ad-hoc paragraph; it's also wired into a genuine 403 on the publish mutation itself, not just the client-side role check. There's exactly one real permission-denied surface in this whole app - only `POST /admin/catalog/publish` is admin-only, everything else editor and admin both reach - so no other view needed one; building extra permission checks elsewhere would have been dead code. Deliberately **not** built: global handling for an expired JWT (a 401 today just renders as a generic error wherever it happens to surface) - a session-refresh mechanism is a real gap worth naming, but it's a different failure (unauthenticated vs. unauthorized) from what this phase's exit bar asks for ("wrong-role token"), and out of scope for this challenge's auth trade-off (see the CMS auth entry above).

More to add here as Parts B, C, D, and E get built.
