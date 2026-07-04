# JobMatch AI — Career Intelligence Dashboard

AI-based matching between candidates and job ads (spec: [zadanie_english.md](zadanie_english.md); UI spec: [UI_DESIGN_INSTRUCTIONS.md](UI_DESIGN_INSTRUCTIONS.md)).

Current state: the full **Career Intelligence Dashboard** UI on seeded sample job ads — landing page, 3-step onboarding (goals → CV upload → AI profile review), bento dashboard, job matches feed with filters and saved searches, job detail with AI explanation + 5-factor match breakdown + similar jobs, and an AI profile page with strength scoring. Single demo profile, no auth yet.

Routes: `/{en|bg}` landing · `/{locale}/onboarding` · `/{locale}/app` dashboard · `/app/matches` · `/app/jobs/{id}` · `/app/profile` · `/app/searches`.

## Stack

- **Backend:** FastAPI + SQLAlchemy + PostgreSQL/pgvector (Docker)
- **AI:** Claude (CV parsing, explanations) + Voyage multilingual embeddings — with an offline `mock` embedding mode so everything runs without API keys
- **Frontend:** Next.js + Tailwind, lightweight i18n (EN + BG; RO is just another messages file later)

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

## Notes

- Schema changes are currently applied with `python -m scripts.seed_jobs --reset --demo-profile` (drops and recreates all tables). Alembic migrations come with real deployment.
- Saved searches store an `alerts_enabled` flag; email delivery wires in once the ingestion pipeline runs on a schedule (the Alerts settings page is intentionally deferred until then).

## What's next (from the agreed plan)

1. Real ingestion: Jooble/Adzuna API connectors + jobs.bg/zaplata.bg scrapers → normalize → dedupe → embed (replaces `scripts/seed_jobs.py`).
2. Auth (managed provider) + per-user profiles; GDPR deletion/export.
3. Email alerts driven by saved searches (evaluated after each ingestion run) + the Alerts settings page.
4. ESCO skill taxonomy mapping for structured, language-independent gap analysis.
5. Romanian locale, mobile (React Native/Expo), monetization gating (freemium vs trial — decision deferred).
