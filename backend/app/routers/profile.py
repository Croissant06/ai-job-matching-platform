from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import CandidateProfile
from app.schemas import ProfileOut, ProfileUpdate
from app.services import llm
from app.services.cv_extract import extract_text
from app.services.embeddings import embed_text, profile_embedding_text

router = APIRouter(prefix="/api/profile", tags=["profile"])


def get_current_profile(db: Session) -> CandidateProfile | None:
    # Single-profile demo mode; replaced by the authenticated user's profile later.
    return db.execute(
        select(CandidateProfile).order_by(CandidateProfile.updated_at.desc())
    ).scalars().first()


def compute_strength(profile: CandidateProfile) -> tuple[int, list[str]]:
    """Completeness score + i18n suggestion keys, shown on the profile page and dashboard."""
    score = 0
    suggestions: list[str] = []

    score += 10 if profile.full_name else 0
    score += 10 if profile.city else 0
    score += 10 if profile.seniority else 0
    score += 5 if profile.years_experience is not None else 0
    score += 10 if profile.roles else 0
    score += 10 if profile.languages else 0

    skills = len(profile.skills or [])
    score += 15 if skills >= 5 else (8 if skills else 0)
    if skills < 5:
        suggestions.append("addSkills")

    if profile.summary:
        score += 10
    else:
        suggestions.append("addSummary")

    if profile.preferred_workplaces:
        score += 10
    else:
        suggestions.append("addWorkTypes")

    if profile.salary_expectation:
        score += 10
    else:
        suggestions.append("addSalary")

    if not profile.preferred_cities:
        suggestions.append("addCities")

    return score, suggestions


def profile_to_out(profile: CandidateProfile) -> ProfileOut:
    out = ProfileOut.model_validate(profile)
    out.strength, out.suggestions = compute_strength(profile)
    return out


def _reembed(profile: CandidateProfile) -> None:
    profile.embedding = embed_text(
        profile_embedding_text(
            profile.roles or [], profile.skills or [], profile.seniority, profile.summary
        )
    )


@router.get("", response_model=ProfileOut)
def read_profile(db: Session = Depends(get_db)):
    profile = get_current_profile(db)
    if not profile:
        raise HTTPException(status_code=404, detail="No profile yet — upload a CV")
    return profile_to_out(profile)


@router.post("/cv", response_model=ProfileOut)
def upload_cv(file: UploadFile, db: Session = Depends(get_db)):
    content = file.file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB)")

    cv_text = extract_text(file.filename or "cv.pdf", content)
    parsed = llm.parse_cv(cv_text)

    profile = get_current_profile(db) or CandidateProfile()
    profile.full_name = parsed.get("full_name")
    profile.email = parsed.get("email")
    profile.phone = parsed.get("phone")
    profile.country = parsed.get("country")
    profile.city = parsed.get("city")
    profile.seniority = parsed.get("seniority")
    profile.years_experience = parsed.get("years_experience")
    profile.roles = parsed.get("roles") or []
    profile.skills = parsed.get("skills") or []
    profile.languages = parsed.get("languages") or []
    profile.summary = parsed.get("summary")
    profile.cv_text = cv_text
    profile.version = (profile.version or 0) + 1
    _reembed(profile)

    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile_to_out(profile)


@router.put("", response_model=ProfileOut)
def update_profile(update: ProfileUpdate, db: Session = Depends(get_db)):
    profile = get_current_profile(db)
    if not profile:
        raise HTTPException(status_code=404, detail="No profile yet — upload a CV")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    profile.version += 1
    _reembed(profile)

    db.commit()
    db.refresh(profile)
    return profile_to_out(profile)
