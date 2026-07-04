from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import FeedbackEvent, SavedSearch
from app.routers.jobs import job_to_match
from app.routers.profile import compute_strength, get_current_profile
from app.schemas import DashboardOut
from app.services.matching import SearchFilters, search_jobs

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db)):
    profile = get_current_profile(db)
    if not profile:
        raise HTTPException(status_code=404, detail="No profile yet")

    # One ranked pass over the corpus feeds best match, new-match count and
    # the missing-skills summary — no LLM involved.
    results = search_jobs(db, profile, SearchFilters(), limit=30)

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    new_matches = sum(1 for job, f in results if job.posted_at >= week_ago and f["score"] >= 0.35)

    profile_skills = {s.strip().lower() for s in (profile.skills or [])}
    gap_counter: Counter[str] = Counter()
    for job, _ in results[:10]:
        for skill in job.skills or []:
            if skill.strip().lower() not in profile_skills:
                gap_counter[skill.strip().lower()] += 1
    missing_skills = [skill for skill, _ in gap_counter.most_common(5)]

    saved_searches = db.execute(
        select(func.count()).select_from(SavedSearch).where(SavedSearch.profile_id == profile.id)
    ).scalar_one()
    saved_jobs = db.execute(
        select(func.count(func.distinct(FeedbackEvent.job_id))).where(
            FeedbackEvent.profile_id == profile.id, FeedbackEvent.event_type == "save"
        )
    ).scalar_one()

    strength, suggestions = compute_strength(profile)
    return DashboardOut(
        full_name=profile.full_name,
        profile_strength=strength,
        suggestions=suggestions,
        best_match=job_to_match(*results[0]) if results else None,
        new_matches=new_matches,
        saved_searches=saved_searches,
        saved_jobs=saved_jobs,
        missing_skills=missing_skills,
    )
