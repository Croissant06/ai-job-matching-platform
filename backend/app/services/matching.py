"""Layered ranking funnel.

Layer 1: SQL hard filters (location, seniority, workplace, salary...) — free.
Layer 2: pgvector cosine similarity blended with rule-based factor scores
         (skills, experience, location, salary, language) — the match score,
         one indexed query plus cheap Python.
Layer 3: LLM explanation — NOT here; generated lazily per viewed job (jobs.py).
"""

import math
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ingestion.normalize import to_eur
from app.models import CandidateProfile, FeedbackEvent, Job
from app.services.embeddings import embed_text

SENIORITY_ORDER = ["intern", "junior", "mid", "senior", "management"]

# Factor weights; semantic similarity carries the most signal, the rest are
# the explainable "match factors" surfaced in the UI.
WEIGHTS = {
    "semantic": 0.40,
    "skills": 0.20,
    "experience": 0.12,
    "location": 0.12,
    "salary": 0.08,
    "language": 0.08,
}

CANDIDATE_POOL = 200  # jobs pulled from layer 2 before final blend/sort

# Job.language codes -> spoken-language names as the CV parser emits them.
JOB_LANGUAGE_NAMES = {"bg": "bulgarian", "en": "english", "ro": "romanian"}


@dataclass
class SearchFilters:
    countries: list[str] | None = None
    cities: list[str] | None = None
    seniorities: list[str] | None = None
    workplaces: list[str] | None = None
    employment_types: list[str] | None = None
    languages: list[str] | None = None
    salary_min: int | None = None
    min_score: int | None = None  # 0..100
    query: str | None = None

    @classmethod
    def from_dict(cls, data: dict) -> "SearchFilters":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


def _skill_overlap(candidate_skills: list[str], job_skills: list[str]) -> float:
    if not job_skills:
        return 0.5  # job lists no skills — neutral, don't punish
    cand = {s.strip().lower() for s in candidate_skills}
    job = {s.strip().lower() for s in job_skills}
    return len(cand & job) / len(job)


def _experience_score(profile: CandidateProfile, job: Job) -> float:
    """Seniority proximity, considering both detected and targeted levels."""
    if not job.seniority:
        return 0.5
    levels = set(profile.target_seniorities or [])
    if profile.seniority:
        levels.add(profile.seniority)
    if not levels:
        return 0.5
    if job.seniority in levels:
        return 1.0
    try:
        job_idx = SENIORITY_ORDER.index(job.seniority)
        distance = min(abs(SENIORITY_ORDER.index(lv) - job_idx) for lv in levels if lv in SENIORITY_ORDER)
    except (ValueError, TypeError):
        return 0.5
    return {1: 0.6}.get(distance, 0.15)


def _location_score(profile: CandidateProfile, job: Job) -> float:
    if job.workplace == "remote":
        return 1.0
    cities = {c.lower() for c in (profile.preferred_cities or [])}
    if not cities and profile.city:
        cities = {profile.city.lower()}
    countries = {c.upper() for c in (profile.preferred_countries or [])}
    if not countries and profile.country:
        countries = {profile.country.upper()}
    if not cities and not countries:
        return 0.7  # no location signal — neutral
    if job.city and job.city.lower() in cities:
        return 1.0
    if job.country and job.country.upper() in countries:
        return 1.0 if profile.relocation_ready else 0.6
    return 0.5 if profile.relocation_ready else 0.25


def _salary_score(profile: CandidateProfile, job: Job) -> float:
    # Compare in EUR — a 2000 GBP job and a 2000 BGN expectation are not equal.
    # Profile expectations are entered in BGN (primary market).
    expectation = to_eur(profile.salary_expectation, "BGN")
    ceiling = job.salary_max_eur or job.salary_min_eur
    if not expectation or not ceiling:
        return 0.6  # unknown on either side — neutral
    if ceiling >= expectation:
        return 1.0
    return max(0.1, (ceiling / expectation) * 0.8)


def _language_score(profile: CandidateProfile, job: Job) -> float:
    spoken = {lang.strip().lower() for lang in (profile.languages or [])}
    if not spoken:
        return 0.5
    required = JOB_LANGUAGE_NAMES.get(job.language)
    if not required:
        return 0.5
    return 1.0 if required in spoken else 0.35


def _blend_query_vector(profile_vec: list[float], query_vec: list[float]) -> list[float]:
    # Semantic text search stays personalized: average of profile and query
    # embeddings, re-normalized.
    mixed = [(p + q) / 2 for p, q in zip(profile_vec, query_vec)]
    norm = math.sqrt(sum(v * v for v in mixed)) or 1.0
    return [v / norm for v in mixed]


def score_job(profile: CandidateProfile, job: Job, semantic: float) -> dict:
    factors = {
        "semantic": semantic,
        "skills": _skill_overlap(profile.skills or [], job.skills or []),
        "experience": _experience_score(profile, job),
        "location": _location_score(profile, job),
        "salary": _salary_score(profile, job),
        "language": _language_score(profile, job),
    }
    factors["score"] = sum(WEIGHTS[name] * value for name, value in factors.items() if name in WEIGHTS)
    return factors


def base_job_query(filters: SearchFilters):
    now = datetime.now(timezone.utc)
    stmt = select(Job).where(Job.is_active.is_(True))
    stmt = stmt.where((Job.expires_at.is_(None)) | (Job.expires_at > now))

    if filters.countries:
        stmt = stmt.where(Job.country.in_(filters.countries))
    if filters.cities:
        # Remote jobs match regardless of city choice.
        stmt = stmt.where(Job.city.in_(filters.cities) | (Job.workplace == "remote"))
    if filters.seniorities:
        stmt = stmt.where(Job.seniority.in_(filters.seniorities))
    if filters.workplaces:
        stmt = stmt.where(Job.workplace.in_(filters.workplaces))
    if filters.employment_types:
        stmt = stmt.where(Job.employment_type.in_(filters.employment_types))
    if filters.languages:
        stmt = stmt.where(Job.language.in_(filters.languages))
    if filters.salary_min:
        # Per spec: salary filter applies only when the ad has salary info.
        # User input is BGN; comparison happens on the EUR-normalized column.
        stmt = stmt.where(Job.salary_max_eur >= to_eur(filters.salary_min, "BGN"))
    return stmt


def search_jobs(
    db: Session, profile: CandidateProfile, filters: SearchFilters, limit: int = 30
) -> list[tuple[Job, dict]]:
    """Returns (job, factors) sorted by blended match score. Factor values are 0..1."""
    query_vec = list(profile.embedding)
    if filters.query:
        query_vec = _blend_query_vector(query_vec, embed_text(filters.query, input_type="query"))

    stmt = base_job_query(filters)

    hidden = select(FeedbackEvent.job_id).where(
        FeedbackEvent.profile_id == profile.id, FeedbackEvent.event_type == "hide"
    )
    stmt = stmt.where(Job.id.not_in(hidden))

    distance = Job.embedding.cosine_distance(query_vec)
    rows = db.execute(
        stmt.add_columns(distance.label("distance")).order_by(distance).limit(CANDIDATE_POOL)
    ).all()

    results = []
    for job, dist in rows:
        semantic = max(0.0, min(1.0, 1.0 - float(dist)))  # cosine similarity clamped to 0..1
        factors = score_job(profile, job, semantic)
        if filters.min_score and factors["score"] * 100 < filters.min_score:
            continue
        results.append((job, factors))

    results.sort(key=lambda r: r[1]["score"], reverse=True)
    return results[:limit]


def score_single_job(db: Session, profile: CandidateProfile, job: Job) -> dict:
    dist = db.execute(
        select(Job.embedding.cosine_distance(list(profile.embedding))).where(Job.id == job.id)
    ).scalar_one()
    semantic = max(0.0, min(1.0, 1.0 - float(dist)))
    return score_job(profile, job, semantic)


def similar_jobs(db: Session, job: Job, limit: int = 4) -> list[Job]:
    now = datetime.now(timezone.utc)
    distance = Job.embedding.cosine_distance(list(job.embedding))
    return list(
        db.execute(
            select(Job)
            .where(Job.id != job.id, Job.is_active.is_(True))
            .where((Job.expires_at.is_(None)) | (Job.expires_at > now))
            .order_by(distance)
            .limit(limit)
        ).scalars()
    )


def profile_summary_for_llm(profile: CandidateProfile) -> str:
    return (
        f"Seniority: {profile.seniority or 'unknown'}, "
        f"{profile.years_experience or '?'} years of experience\n"
        f"Roles: {', '.join(profile.roles or [])}\n"
        f"Skills: {', '.join(profile.skills or [])}\n"
        f"Languages: {', '.join(profile.languages or [])}\n"
        f"Location: {profile.city or ''} {profile.country or ''}\n"
        f"Summary: {profile.summary or ''}"
    )


def job_summary_for_llm(job: Job) -> str:
    salary = ""
    if job.salary_min or job.salary_max:
        salary = f"Salary: {job.salary_min or '?'}-{job.salary_max or '?'} {job.salary_currency or ''}\n"
    return (
        f"Title: {job.title}\nCompany: {job.company}\n"
        f"Location: {job.city or ''} {job.country} ({job.workplace}, {job.employment_type})\n"
        f"Seniority: {job.seniority or 'unspecified'}\n{salary}"
        f"Required skills: {', '.join(job.skills or [])}\n"
        f"Description: {job.description[:2000]}"
    )
