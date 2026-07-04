# JobMatch AI — Vertical Slice

AI-based matching between candidates and job ads (see [zadanie_english.md](zadanie_english.md) for the full spec).

This is the **vertical slice**: CV upload → AI profile → semantic matching → ranked results with match scores, on-demand AI explanations and gap analysis — running on seeded sample job ads instead of live scrapers. Single demo profile, no auth yet.

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

1. **Layered ranking funnel** — SQL filters → pgvector cosine similarity blended with rule scores (skills 25%, seniority 15%, semantic 60%) → LLM explanations only for jobs the user actually opens, cached per (job, profile version, locale). LLM cost scales with views (~10–20/session), not with corpus size.
2. **Multilingual embeddings** (Voyage) put BG/RO/EN in one vector space — a Bulgarian CV matches an English ad with no translation pipeline.
3. **Profile versioning** — every edit bumps `version`, re-embeds, and invalidates cached explanations.
4. **Feedback events logged from day 1** (`feedback_events`: impression/click/save/hide/apply) — raw material for the phase-3 self-learning ranker; cannot be backfilled later. "Hide" already excludes jobs from results.
5. **Canonical job model** — `jobs` is the deduped canonical entity; the ingestion pipeline (aggregator APIs + scrapers) will add per-source postings under it.
6. **Modular monolith** — one FastAPI app + (future) scheduled ingestion job. No queues/Celery until volume demands it.

## What's next (from the agreed plan)

1. Real ingestion: Jooble/Adzuna API connectors + jobs.bg/zaplata.bg scrapers → normalize → dedupe → embed (replaces `scripts/seed_jobs.py`).
2. Auth (managed provider) + per-user profiles; GDPR deletion/export.
3. Saved searches + email alerts (evaluated after each ingestion run).
4. ESCO skill taxonomy mapping for structured, language-independent gap analysis.
5. Romanian locale, mobile (React Native/Expo), monetization gating (freemium vs trial — decision deferred).
