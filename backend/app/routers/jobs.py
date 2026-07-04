import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Job, JobExplanation
from app.routers.profile import get_current_profile
from app.schemas import ExplanationOut, FilterOptions, JobMatch, ScoreBreakdown, SearchResponse
from app.services import llm
from app.services.matching import (
    SearchFilters,
    job_summary_for_llm,
    profile_summary_for_llm,
    search_jobs,
)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("/search", response_model=SearchResponse)
def search(
    db: Session = Depends(get_db),
    q: str | None = None,
    country: list[str] = Query(default=[]),
    city: list[str] = Query(default=[]),
    seniority: list[str] = Query(default=[]),
    workplace: list[str] = Query(default=[]),
    employment_type: list[str] = Query(default=[]),
    salary_min: int | None = None,
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
        salary_min=salary_min,
        query=q,
    )
    results = search_jobs(db, profile, filters, limit=limit)

    jobs = [
        JobMatch(
            **{c.name: getattr(job, c.name) for c in Job.__table__.columns if c.name != "embedding"},
            score=round(scores["score"] * 100),
            score_breakdown=ScoreBreakdown(
                semantic=round(scores["semantic"] * 100),
                skills=round(scores["skills"] * 100),
                seniority=round(scores["seniority"] * 100),
            ),
        )
        for job, scores in results
    ]
    return SearchResponse(jobs=jobs, total=len(jobs))


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
    db.commit()
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
    return FilterOptions(countries=countries, cities=cities)
