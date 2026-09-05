# Peblo TV Mini

Take-home challenge for Peblo (Full-Stack Platform Engineer, Python/FastAPI + React).

CMS upload -> published catalogue -> Netflix-style browse. An internal CMS uploads show/episode content and artwork, the backend validates everything and publishes a catalogue file, and a separate viewer UI reads only that file.

## Stack

FastAPI, PostgreSQL (SQLAlchemy + Alembic), React + TypeScript for the CMS and viewer.

## Status

Backend (Part A) is complete: schema, migrations, seed script, health check, JWT auth with editor/admin roles, full CRUD for shows/seasons/episodes with the three publish-blocking rules enforced, artwork upload with a storage abstraction, an atomic publish job, the public `/catalog` + `/catalog/search` read endpoints, a live validation report, a paginated publish-run history endpoint (added during Part B once the CMS needed it), and a test suite (53 tests) covering the riskiest logic.

CMS (Part B) is complete: the project skeleton with login/JWT/authenticated API client, a shows list (search, section/status/category filters, pagination, URL-persisted state), a show detail page with a seasons -> episodes drill-down, create/edit forms for shows, seasons (add-only), and episodes with real backend validation messages surfaced inline, a three-slot artwork uploader (poster/banner/thumbnail) on the show/episode edit forms with live preview and real validation errors, a publish page (validation report, a publish button gated by role and blocking issues, and paginated run history backed by a new `GET /admin/publish-runs` endpoint), and a full loading/empty/error/permission-denied state sweep across every view.

Viewer (Part C) is complete: Phase C1 (project skeleton + data layer) - a separate `viewer/` app with zero auth/token concept, reading only the two public `/catalog` and `/catalog/search` routes. `fetchCatalog`/`searchCatalog` wrap a shared `CatalogError`-throwing fetch helper; TanStack Query hooks (`useCatalog`, `useSearch`) sit on top. Phase C2 (home hero + rows) - the home page renders a real hero (banner artwork, title, synopsis, link into the show) from the first catalog section's first show, plus one horizontally-scrollable row per section with poster-artwork tiles. Phase C3 (show detail) - the show page renders poster artwork, synopsis, categories, each season's episodes in order (thumbnail, title, `mm:ss` duration, language badges) and a separate "Trailers" section for season 0, all found client-side in the already-fetched catalogue with no extra network call. Phase C4 (search and filters) - a search page with a debounced text box plus section/category/language dropdowns, all backed by `GET /catalog/search` and mirrored in the URL; results render grouped by show (in the backend's own row order) rather than pretending to reconstruct a season/episode structure the flat search response doesn't carry. Phase C5 (loading/error states + slow-image polish) - deterministic skeletons (sized to the real artwork aspect ratios, not a generic spinner) replace the plain "Loading…" text on every page; a distinct, non-technical "Nothing to watch here yet" state covers the real 404-before-first-publish case, kept separate from a genuine fetch failure (which gets a message plus a working Retry button); `ArtworkImage` now fades a real image in over its placeholder box once it loads, rather than popping in instantly.

Part D (pipeline and operability) is complete: a `Dockerfile` for each of the three services (backend: `python:3.12-slim` running Alembic migrations then Uvicorn via an entrypoint script; cms/viewer: a Node build stage producing static assets, served by an `nginx:alpine` runtime stage) plus a root `docker-compose.yml` wiring `db` + `api` + `cms` + `viewer` together with a Postgres healthcheck gate; a GitHub Actions workflow (`.github/workflows/ci.yml`) running backend lint (`ruff`) and both frontend lints (`oxlint` + `tsc`) in parallel, backend tests against a real Postgres service container, then building all three Docker images, then a written (not wired to any real target) deploy step; a completed `backend/.env.example` (the one env-example gap the repo had); and secrets-management/alerting paragraphs below.

## Running it

### Full stack via Docker

The whole thing - Postgres, backend, CMS, viewer - comes up with one command from the repo root:

```
docker compose up -d --build
```

CMS is at `http://localhost:5173`, viewer at `http://localhost:5174`, API at `http://localhost:8010`. The `api` service runs `alembic upgrade head` on every start (via `backend/docker-entrypoint.sh`) and seeds the DB on first boot (`SEED_ON_START=true` in `docker-compose.yml`) before starting Uvicorn. Inside the compose network, `api` talks to Postgres as `db:5432` (the Compose service name and the container-internal port), not `localhost:5433` - that host-side mapping in `.env` is only correct for tooling running directly on your machine, so `docker-compose.yml` overrides `DATABASE_URL` explicitly for the `api` service rather than trusting `env_file` alone.

### Backend, run directly on the host

For local dev without rebuilding a container on every change:

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

53 tests. Most need no DB at all; the five in `test_role_enforcement_integration.py` and the two in `test_artwork_read.py` need `docker compose up -d db` and skip cleanly (not fail) if it's not reachable. CI runs the same suite against a real Postgres service container, so those seven get exercised for real on every push (see the CI section below).

Lint (backend):

```
pip install -r requirements-dev.txt
ruff check app tests scripts
```

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

## CI/CD

`.github/workflows/ci.yml` runs on every push and PR to `main`:

1. **Lint** (parallel): `ruff check` on the backend, `oxlint` + `tsc --noEmit` on each of `cms`/`viewer`.
2. **Test**: the full `pytest` suite against a real `postgres:16` service container, migrated with `alembic upgrade head` first - the DB-dependent tests actually run in CI, not just skip.
3. **Build**: `docker build` for all three Dockerfiles (backend, cms, viewer), gated on lint+test passing.
4. **Deploy**: a written-out, commented step describing the real pipeline (push images to a registry, run migrations against prod before the traffic swap, roll each service to the new tag with a health check, auto-rollback on failure) - not wired to any actual infrastructure, since none is provisioned for this exercise.

**Secrets management (production):** `SECRET_KEY` (JWT signing) and `DATABASE_URL` (which embeds the DB password) are the two real secrets here. Locally they live in `backend/.env`, which is gitignored - `.env.example` documents the shape without real values. In CI, `DATABASE_URL` for the test job points at the disposable service-container DB, not a real credential, so nothing sensitive needs to be a repo secret yet; a real deploy job would pull `SECRET_KEY` and the production `DATABASE_URL` from the CI provider's encrypted secrets store (GitHub Actions secrets, or a dedicated manager like AWS Secrets Manager / Vault if the deploy target already uses one) and inject them as environment variables at deploy time - never committed, never printed in logs, and rotated independently of any code change.

**What I'd alert on:** `GET /health` (`backend/app/routers/health.py`) runs a real `SELECT 1` against Postgres, so it's a genuine dependency check, not just "the process is up." I'd alert on **`/health` returning non-200 (or timing out) for more than ~2 consecutive minutes** - a short blip is often a deploy rolling or a transient connection hiccup, but a sustained failure means either the API process is down or it's up but can't reach the database, and both mean the CMS can't do anything (no CRUD, no publish) and the viewer's `/catalog` reads start failing too, so it's the single check that best represents "is this system actually usable." I'd page rather than just log it, since there's no graceful degraded mode here - either the DB is reachable or the whole product is down. A second-tier signal worth adding later: alerting on publish-job failures (`publish_runs.outcome == "failed"`), since a broken publish can leave the live catalogue silently stale even while `/health` stays green.

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
- **CMS artwork upload:** Slots only render on the show/episode **edit** forms, not create - `POST /artwork` requires an existing `show_id`/`episode_id` to attach to. `ShowRead`/`EpisodeRead` now include an `artwork` map (an `artwork_map` property on each model, reusing the same latest-per-kind dedup rule the catalog builder already used, exposed via a Pydantic validation alias), so the CMS shows what's actually persisted rather than only what was picked in the current page visit; uploading invalidates the parent show/episode query so the slot updates immediately without a manual reload. Re-uploading the same kind still doesn't replace anything (the backend always inserts a new row, latest `id` wins per kind), so uploading twice leaves two rows - not guarded against in the UI beyond the single-upload flow. An episode's publish check only requires *any one* artwork row (`if not episode.artworks`), not all three kinds, so the three-slot UI is editorial completeness, not a per-slot enforcement the backend checks.
- **CMS publish page:** The backend had no way to list past publish runs - `POST /admin/catalog/publish` only ever returned the run it had just triggered - so a new `GET /admin/publish-runs` (editor-gated, paginated, same shape as the shows list) was added to the backend rather than faking history in `localStorage`, since real cross-session/cross-device history is what "run history" actually means and the `publish_runs` table already had every column needed. It's editor-gated, not admin-only, for the same reason the validation report is: an editor needs to confirm their fix actually got published, even though they can't trigger one. The publish button itself is hidden (not just disabled) for an editor, with a one-line explanation of the role restriction; for an admin it's disabled with the exact blocking-issue count until the validation report clears to zero.
- **Viewer skeleton:** A genuinely separate app from the CMS, not a route inside it - it has no `auth/` directory, no token storage, no `Authorization` header anywhere, since it only ever calls the two unauthenticated `/catalog*` routes. Show detail routes on `slug` (`/shows/:slug`), not `id` - the catalogue already carries `slug` on every show and a slug-based URL is the natural public pattern - and the matching show is found client-side within the already-fetched catalogue rather than a second network call, since no per-show public endpoint exists. Dependency versions are pinned to match the CMS's where there's no reason to diverge (same React/Vite/TanStack Query/react-router-dom majors).
- **Viewer home (hero + rows):** `reference.json`'s `sections` list (`featured`, `series`, `minisodes`, `songs`) is the catalogue's real display order, already applied server-side by `build_catalog()` - the viewer just renders `catalog.sections` in the order it arrives, no re-sorting or a special "featured" case, and takes the first section's first show as the hero source. Artwork URLs the backend returns (`/static/artwork/...`) are relative to the *API* origin, not the viewer's own dev server, so a small `assetUrl()` helper prefixes them with `VITE_API_URL` - easy to miss since C1 never rendered an `<img>` to catch it. A missing artwork kind (the common case in this seed data) renders as an accessible placeholder box (`role="img"` + `aria-label`) sized via `aspect-ratio` rather than a broken `<img>` or a collapsed layout, reusing the same box for both the hero banner and row poster tiles so there's one place that owns the missing-artwork behavior.
- **Viewer show detail:** `languages` is rendered as a small badge list (`EN`, `HI`), not a picker - there's no playback anywhere in this app, so it's describing which dubs exist for a collapsed episode, not letting the viewer choose one. `show.seasons` and `show.trailers` are trusted as already split and ordered by `build_catalog()` - unlike the CMS's own show detail page, which has to derive that grouping itself from the raw `/seasons`+`/episodes` API. A missing `duration_seconds` (nullable even after publish validation) omits the duration badge entirely rather than showing a placeholder string, matching how a missing artwork kind is already handled.
- **Viewer search:** Filters compose exactly as the backend does - `q` substring-matches show/episode title and category, `category`/`language`/`section` are exact (not fuzzy) filters, all AND together - re-checked against `backend/tests/test_catalog_search.py` rather than guessed. The free-text box is debounced (300ms) before it updates the URL/query, since the backend re-parses the full catalogue on every search request; the three dropdown filters apply immediately since they're discrete selections, not keystrokes. Results carry no `episode_number` or season context, so they're grouped by show for readability but never re-sorted or forced into a fake season structure - group and in-group order both come straight from the backend's own flat response order. Landing on `/search` with no filters shows the full result set immediately (matching the backend's own no-filter-means-everything behavior), and a genuine zero-match query ("No results for these filters.") is kept visibly distinct from the "nothing published yet" 404 case, since they're different situations reached through different code paths.
- **Viewer loading/error/slow-image states:** TanStack Query's default retries are turned off for this app (`retry: false`) - the automatic exponential-backoff retries would otherwise delay a real 404 or 500 from ever reaching the UI's own error branch by several seconds, fighting the deliberate Retry button this phase adds. A 404 (nothing published yet) gets upbeat, non-technical copy distinct from a genuine fetch failure (network/server error), which instead shows the real message plus a Retry button that calls `refetch()` - two different situations reached through two different code paths, not the same message reused. Loading states are purpose-built skeleton shapes sized to the real artwork aspect ratios (`2 / 3` posters, `16 / 9` banners/thumbnails) rather than a generic spinner, in the same spirit as the CMS's `SkeletonRows` but not a literal copy, since this app's layout is artwork-grid/row-based, not tabular. `ArtworkImage` already reserved layout space via `aspect-ratio` since C2 (so there's no shift when an image resolves); this phase adds a `loaded`-state fade-in on the real `<img>`'s `onLoad`, so a slow-loading image fades in over its placeholder box instead of popping in instantly - a missing artwork kind (no `src` at all) never touches this fade logic, it's still the original synchronous placeholder.
- **CMS UI states:** Auditing every view against the four required states surfaced a real bug, not just a gap: `ShowFormPage`/`EpisodeFormPage` checked `existing.isLoading` in edit mode but never `existing.isError`, so opening an edit URL for a deleted or bad id (a stale bookmark, a typo'd id) silently rendered a blank form instead of the real 404 - fixed with the same `ErrorState` + retry pattern the rest of the app already uses. Added a dedicated `PermissionDeniedState` component (amber, not the alarming red of `ErrorState`) rather than leaving the publish page's role-restriction message as an ad-hoc paragraph; it's also wired into a genuine 403 on the publish mutation itself, not just the client-side role check. There's exactly one real permission-denied surface in this whole app - only `POST /admin/catalog/publish` is admin-only, everything else editor and admin both reach - so no other view needed one; building extra permission checks elsewhere would have been dead code. Deliberately **not** built: global handling for an expired JWT (a 401 today just renders as a generic error wherever it happens to surface) - a session-refresh mechanism is a real gap worth naming, but it's a different failure (unauthenticated vs. unauthorized) from what this phase's exit bar asks for ("wrong-role token"), and out of scope for this challenge's auth trade-off (see the CMS auth entry above).

- **Visual design pass:** Both apps got hand-written CSS (no framework) after both apps looked flat with only raw inline styles - design tokens as CSS custom properties in each `index.css` (color, spacing, radius), base styles for `button`/`input`/`select`/`table`/`a` so every existing screen improves without touching most component code, plus a few targeted structural changes: a shared CMS `Header` (nav + logged-in-as + log out) extracted from what was one-off chrome on the shows list, `.card` styling on the CMS's table/publish sections, and a dark "Netflix-style" theme for the viewer (gradient-overlaid hero, hover-lift on poster tiles, row hover states) to actually match the brief's own description of the browse experience. Both apps ended up dark-themed - the CMS was converted from an initial light pass after the fact, so an internal tool and a public-facing app share one visual system rather than looking like two different products.
- **Pipeline (Docker + CI):** Each frontend Dockerfile is a two-stage build (Node build stage -> static assets copied into an `nginx:alpine` runtime stage) since neither app needs Node at runtime, only its build output; `VITE_API_URL` is passed as a build `ARG` because Vite inlines env vars at build time, not read at container start. The backend image runs a small `docker-entrypoint.sh` (migrate, optionally seed, then start Uvicorn) instead of a bare `CMD`, so `docker compose up` alone gets a fully-migrated, ready-to-use API with no manual `alembic upgrade head` step. `docker-compose.yml`'s `api` service overrides `DATABASE_URL` explicitly rather than relying on `.env` alone, since that file's `localhost:5433` is a host-side mapping that means something different (and wrong) from inside the container - caught with `docker compose config` before ever starting a container, not by trial and error. CI builds all three images but doesn't push or run them anywhere; the deploy job is intentionally a written, commented plan rather than a real target, since none was provisioned for this exercise.

More to add here as Part E gets built.
