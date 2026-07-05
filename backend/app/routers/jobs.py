import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Job, JobExplanation
from app.routers.profile import get_current_profile
from app.schemas import (
    ExplanationOut,
    FilterOptions,
    JobMatch,
    ScoreBreakdown,
    SearchResponse,
    SimilarJob,
)
from app.services import llm
from app.services.matching import (
    SearchFilters,
    job_summary_for_llm,
    profile_summary_for_llm,
    score_single_job,
    search_jobs,
    similar_jobs,
)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

JOB_COLUMNS = [c.name for c in Job.__table__.columns if c.name != "embedding"]


def job_to_match(job: Job, factors: dict) -> JobMatch:
    return JobMatch(
        **{name: getattr(job, name) for name in JOB_COLUMNS},
        score=round(factors["score"] * 100),
        score_breakdown=ScoreBreakdown(
            **{name: round(value * 100) for name, value in factors.items() if name != "score"}
        ),
    )


@router.get("/search", response_model=SearchResponse)
def search(
    db: Session = Depends(get_db),
    q: str | None = None,
    country: list[str] = Query(default=[]),
    city: list[str] = Query(default=[]),
    seniority: list[str] = Query(default=[]),
    workplace: list[str] = Query(default=[]),
    employment_type: list[str] = Query(default=[]),
    language: list[str] = Query(default=[]),
    salary_min: int | None = None,
    min_score: int | None = Query(default=None, ge=0, le=100),
    limit: int = Query(default=30, le=100),
):
    profile = get_current_profile(db)
    if not profile:
        raise HTTPException(status_code=404, detail="No profile yet — upload a CV first")

    filters = SearchFilters(
        countries=country or None,
        cities=city or None,
        seniorities=seniority or None,
        workplaces=workplace or None,
        employment_types=employment_type or None,
        languages=language or None,
        salary_min=salary_min,
        min_score=min_score,
        query=q,
    )
    results = search_jobs(db, profile, filters, limit=limit)
    jobs = [job_to_match(job, factors) for job, factors in results]
    return SearchResponse(jobs=jobs, total=len(jobs))


@router.get("/{job_id}", response_model=JobMatch)
def job_detail(job_id: uuid.UUID, db: Session = Depends(get_db)):
    profile = get_current_profile(db)
    if not profile:
        raise HTTPException(status_code=404, detail="No profile yet")
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job_to_match(job, score_single_job(db, profile, job))


@router.get("/{job_id}/similar", response_model=list[SimilarJob])
def similar(job_id: uuid.UUID, limit: int = Query(default=4, le=10), db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return similar_jobs(db, job, limit=limit)


@router.post("/{job_id}/explanation", response_model=ExplanationOut)
def explanation(job_id: uuid.UUID, locale: str = "en", db: Session = Depends(get_db)):
    profile = get_current_profile(db)
    if not profile:
        raise HTTPException(status_code=404, detail="No profile yet")
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    cached = db.execute(
        select(JobExplanation).where(
            JobExplanation.job_id == job.id,
            JobExplanation.profile_id == profile.id,
            JobExplanation.profile_version == profile.version,
            JobExplanation.locale == locale,
        )
    ).scalars().first()
    if cached:
        return ExplanationOut(
            explanation=cached.explanation, missing_skills=cached.missing_skills, cached=True
        )

    result = llm.explain_match(profile_summary_for_llm(profile), job_summary_for_llm(job), locale)
    db.add(
        JobExplanation(
            job_id=job.id,
            profile_id=profile.id,
            profile_version=profile.version,
            locale=locale,
            explanation=result["explanation"],
            missing_skills=result["missing_skills"],
        )
    )
    try:
        db.commit()
    except IntegrityError:
        # A concurrent request cached the same explanation first — use theirs.
        db.rollback()
    return ExplanationOut(**result, cached=False)


meta_router = APIRouter(prefix="/api/meta", tags=["meta"])


@meta_router.get("/options", response_model=FilterOptions)
def filter_options(db: Session = Depends(get_db)):
    countries = db.execute(
        select(Job.country).where(Job.is_active.is_(True)).distinct().order_by(Job.country)
    ).scalars().all()
    cities = db.execute(
        select(Job.city).where(Job.is_active.is_(True), Job.city.is_not(None)).distinct().order_by(Job.city)
    ).scalars().all()
    languages = db.execute(
        select(Job.language).where(Job.is_active.is_(True)).distinct().order_by(Job.language)
    ).scalars().all()
    return FilterOptions(countries=countries, cities=cities, languages=languages)
