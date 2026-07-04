"""Layered ranking funnel.

Layer 1: SQL hard filters (location, seniority, workplace, salary...) — free.
Layer 2: pgvector cosine similarity blended with rule-based feature scores
         (skill overlap, seniority proximity) — the match score, one query.
Layer 3: LLM explanation — NOT here; generated lazily per viewed job (jobs.py).
"""

import math
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import CandidateProfile, FeedbackEvent, Job
from app.services.embeddings import embed_text

SENIORITY_ORDER = ["intern", "junior", "mid", "senior", "management"]

W_SEMANTIC = 0.60
W_SKILLS = 0.25
W_SENIORITY = 0.15

CANDIDATE_POOL = 200  # jobs pulled from layer 2 before final blend/sort


@dataclass
class SearchFilters:
    countries: list[str] | None = None
    cities: list[str] | None = None
    seniorities: list[str] | None = None
    workplaces: list[str] | None = None
    employment_types: list[str] | None = None
    salary_min: int | None = None
    query: str | None = None


def _skill_overlap(candidate_skills: list[str], job_skills: list[str]) -> float:
    if not job_skills:
        return 0.5  # job lists no skills — neutral, don't punish
    cand = {s.strip().lower() for s in candidate_skills}
    job = {s.strip().lower() for s in job_skills}
    return len(cand & job) / len(job)


def _seniority_score(candidate: str | None, job: str | None) -> float:
    if not candidate or not job:
        return 0.5  # unknown — neutral
    try:
        distance = abs(SENIORITY_ORDER.index(candidate) - SENIORITY_ORDER.index(job))
    except ValueError:
        return 0.5
    return {0: 1.0, 1: 0.6}.get(distance, 0.15)


def _blend_query_vector(profile_vec: list[float], query_vec: list[float]) -> list[float]:
    # Semantic text search stays personalized: average of profile and query
    # embeddings, re-normalized.
    mixed = [(p + q) / 2 for p, q in zip(profile_vec, query_vec)]
    norm = math.sqrt(sum(v * v for v in mixed)) or 1.0
    return [v / norm for v in mixed]


def search_jobs(
    db: Session, profile: CandidateProfile, filters: SearchFilters, limit: int = 30
) -> list[tuple[Job, dict]]:
    """Returns (job, scores) sorted by blended match score. Scores are 0..1."""
    query_vec = list(profile.embedding)
    if filters.query:
        query_vec = _blend_query_vector(query_vec, embed_text(filters.query, input_type="query"))

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
    if filters.salary_min:
        # Per spec: salary filter applies only when the ad has salary info.
        stmt = stmt.where(Job.salary_max >= filters.salary_min)

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
        skills = _skill_overlap(profile.skills or [], job.skills or [])
        seniority = _seniority_score(profile.seniority, job.seniority)
        score = W_SEMANTIC * semantic + W_SKILLS * skills + W_SENIORITY * seniority
        results.append(
            (job, {"score": score, "semantic": semantic, "skills": skills, "seniority": seniority})
        )

    results.sort(key=lambda r: r[1]["score"], reverse=True)
    return results[:limit]


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
