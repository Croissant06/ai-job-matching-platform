# JobMatch AI — Career Intelligence Dashboard

AI-based matching between candidates and job ads (spec: [zadanie_english.md](zadanie_english.md); UI spec: [UI_DESIGN_INSTRUCTIONS.md](UI_DESIGN_INSTRUCTIONS.md)).

Current state: the full **Career Intelligence Dashboard** UI on seeded sample job ads — landing page, 3-step onboarding (goals → CV upload → AI profile review), bento dashboard, job matches feed with filters and saved searches, job detail with AI explanation + 5-factor match breakdown + similar jobs, and an AI profile page with strength scoring. Single demo profile, no auth yet.

Routes: `/{en|bg}` landing · `/{locale}/onboarding` · `/{locale}/app` dashboard · `/app/matches` · `/app/jobs/{id}` · `/app/profile` · `/app/searches`.

## Stack

- **Backend:** FastAPI + SQLAlchemy + PostgreSQL/pgvector (Docker)
- **AI:** Claude (CV parsing, explanations) + Voyage multilingual embeddings — with an offline `mock` embedding mode so everything runs without API keys
- **Frontend:** Next.js + Tailwind, lightweight i18n (EN + BG; RO is just another messages file later)

## Day-to-day: starting the app

After the one-time setup below, this is all you need each time:

```powershell
# 0. Make sure Docker Desktop is running (the database starts itself).

# 1. Backend — first PowerShell window (leave it running):
cd D:\JobMatchAI\backend
.venv\Scripts\uvicorn app.main:app --port 8000

# 2. Frontend — second PowerShell window (leave it running):
cd D:\JobMatchAI\frontend
npm run dev

# 3. Open http://localhost:3000 in the browser.

# Optional — collect fresh job ads (safe to re-run any time):
cd D:\JobMatchAI\backend
.venv\Scripts\python -m scripts.ingest
```

To stop: press `Ctrl+C` in both windows (or just close them).

**Troubleshooting**
- App stuck on the loading spinner → database is down: `docker compose up -d` from `D:\JobMatchAI`.
- "Port 3000 is in use" → an old frontend window is still open; close it (or `Get-NetTCPConnection -LocalPort 3000 -State Listen` shows the PID to stop).
- After pulling new code → `.venv\Scripts\pip install -r requirements.txt` (backend) and `npm install` (frontend) pick up new dependencies; if the database structure changed, the PR notes will say to run `scripts.seed_jobs --reset`.

## Quick start

```powershell
# 1. Database
docker compose up -d

# 2. Backend
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
copy .env.example .env          # then set ANTHROPIC_API_KEY (and Voyage for real embeddings)
.venv\Scripts\python -m scripts.seed_jobs --demo-profile
.venv\Scripts\uvicorn app.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                      # http://localhost:3000
```

Without any API keys the app still works end to end using the seeded demo profile and mock embeddings (keyword-hash similarity — matching quality is intentionally poor). To get real behavior:

- `ANTHROPIC_API_KEY` — enables CV upload/parsing and match explanations.
- `EMBEDDING_PROVIDER=voyage` + `VOYAGE_API_KEY` — real multilingual semantic matching (re-run the seed script after switching so job vectors are recomputed).

## Architecture decisions (why it's built this way)

1. **Layered ranking funnel** — SQL filters → pgvector cosine similarity blended with rule-based factors (semantic 40%, skills 20%, experience 12%, location 12%, salary 8%, language 8% — the explainable "match factors" in the UI) → LLM explanations only for jobs the user actually opens, cached per (job, profile version, locale). List views use deterministic skill-overlap "why" lines instead of LLM calls, so LLM cost scales with detail views, not with corpus size.
2. **Multilingual embeddings** (Voyage) put BG/RO/EN in one vector space — a Bulgarian CV matches an English ad with no translation pipeline.
3. **Profile versioning** — every edit bumps `version`, re-embeds, and invalidates cached explanations.
4. **Feedback events logged from day 1** (`feedback_events`: impression/click/save/hide/apply) — raw material for the phase-3 self-learning ranker; cannot be backfilled later. "Hide" already excludes jobs from results.
5. **Canonical job model** — `jobs` is the deduped canonical entity; the ingestion pipeline (aggregator APIs + scrapers) will add per-source postings under it.
6. **Modular monolith** — one FastAPI app + (future) scheduled ingestion job. No queues/Celery until volume demands it.

## Ingestion (real job ads)

```powershell
cd backend
.venv\Scripts\python -m scripts.ingest                       # all configured sources
.venv\Scripts\python -m scripts.ingest --source zaplata.bg --limit 100
```

Pipeline: **fetch → normalize → dedupe → embed → upsert → expire** ([app/ingestion](backend/app/ingestion)). Each source is an isolated connector; one breaking doesn't affect the others. Idempotent — re-runs refresh known ads and merge duplicates instead of duplicating; ads gone from all sources deactivate after `INGEST_STALE_DAYS`.

| Source | Type | Setup |
|---|---|---|
| zaplata.bg | Own scraper via published sitemap (robots-compliant: `/search/` never touched), rate-limited, honest UA | none — works out of the box |
| Jooble (BG, RO) | Aggregator API | free key: https://jooble.org/api/about → `JOOBLE_API_KEY` |
| Adzuna (international) | Aggregator API — no BG/RO coverage | free key: https://developer.adzuna.com/ → `ADZUNA_APP_ID/KEY` |

**jobs.bg is deliberately not scraped** — it serves HTTP 403 to non-browser clients (active anti-bot protection); bypassing that is the legal/technical risk the spec (§3) says to avoid. Some of its inventory arrives via Jooble.

Scheduling (spec: every 2 days): run `scripts.ingest` from Windows Task Scheduler / cron; it's safe to run repeatedly.

## Notes

- **Schema changes ship as Alembic migrations.** After pulling new code: `.venv\Scripts\alembic upgrade head` (from `backend/`) — the API also applies pending migrations automatically on startup. `scripts.seed_jobs --reset` remains as a dev-only full wipe.
- Tests: `.venv\Scripts\python -m pytest tests` (from `backend/`) — covers salary parsing, currency conversion, city/language normalization and dedupe fingerprints.
- Salaries are stored as published (amount + currency) plus an EUR-normalized copy used for filtering and match scoring, so BGN/GBP/RON sources compare correctly.
- Saved searches store an `alerts_enabled` flag; email delivery wires in once the ingestion pipeline runs on a schedule (the Alerts settings page is intentionally deferred until then).

## What's next (from the agreed plan)

1. Auth (managed provider) + per-user profiles; GDPR deletion/export.
2. Email alerts driven by saved searches (evaluated after each ingestion run) + the Alerts settings page.
3. ESCO skill taxonomy mapping for structured, language-independent gap analysis.
4. Romanian locale, mobile (React Native/Expo), monetization gating (freemium vs trial — decision deferred).
