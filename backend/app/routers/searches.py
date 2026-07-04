import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Job, SavedSearch
from app.routers.profile import get_current_profile
from app.schemas import SavedSearchFilters, SavedSearchIn, SavedSearchOut
from app.services.matching import SearchFilters, base_job_query

router = APIRouter(prefix="/api/searches", tags=["saved-searches"])


def _new_matches_count(db: Session, search: SavedSearch) -> int:
    """Active jobs matching the structured filters, posted since the search was last checked.
    Uses hard filters only — cheap COUNT, no vector work."""
    filters = SearchFilters.from_dict(search.filters or {})
    stmt = base_job_query(filters).where(Job.posted_at > search.last_checked_at)
    return db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()


def _to_out(db: Session, search: SavedSearch) -> SavedSearchOut:
    return SavedSearchOut(
        id=search.id,
        name=search.name,
        filters=SavedSearchFilters(**(search.filters or {})),
        alerts_enabled=search.alerts_enabled,
        created_at=search.created_at,
        last_checked_at=search.last_checked_at,
        new_matches=_new_matches_count(db, search),
    )


def _get_owned(db: Session, search_id: uuid.UUID) -> SavedSearch:
    profile = get_current_profile(db)
    if not profile:
        raise HTTPException(status_code=404, detail="No profile yet")
    search = db.get(SavedSearch, search_id)
    if not search or search.profile_id != profile.id:
        raise HTTPException(status_code=404, detail="Saved search not found")
    return search


@router.get("", response_model=list[SavedSearchOut])
def list_searches(db: Session = Depends(get_db)):
    profile = get_current_profile(db)
    if not profile:
        raise HTTPException(status_code=404, detail="No profile yet")
    searches = db.execute(
        select(SavedSearch)
        .where(SavedSearch.profile_id == profile.id)
        .order_by(SavedSearch.created_at.desc())
    ).scalars().all()
    return [_to_out(db, s) for s in searches]


@router.post("", response_model=SavedSearchOut, status_code=201)
def create_search(payload: SavedSearchIn, db: Session = Depends(get_db)):
    profile = get_current_profile(db)
    if not profile:
        raise HTTPException(status_code=404, detail="No profile yet")
    search = SavedSearch(
        profile_id=profile.id,
        name=payload.name.strip() or "Search",
        filters=payload.filters.model_dump(exclude_none=True),
        alerts_enabled=payload.alerts_enabled,
    )
    db.add(search)
    db.commit()
    db.refresh(search)
    return _to_out(db, search)


@router.put("/{search_id}", response_model=SavedSearchOut)
def update_search(search_id: uuid.UUID, payload: SavedSearchIn, db: Session = Depends(get_db)):
    search = _get_owned(db, search_id)
    search.name = payload.name.strip() or search.name
    search.filters = payload.filters.model_dump(exclude_none=True)
    search.alerts_enabled = payload.alerts_enabled
    db.commit()
    db.refresh(search)
    return _to_out(db, search)


@router.post("/{search_id}/viewed", response_model=SavedSearchOut)
def mark_viewed(search_id: uuid.UUID, db: Session = Depends(get_db)):
    search = _get_owned(db, search_id)
    search.last_checked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(search)
    return _to_out(db, search)


@router.delete("/{search_id}", status_code=204)
def delete_search(search_id: uuid.UUID, db: Session = Depends(get_db)):
    search = _get_owned(db, search_id)
    db.delete(search)
    db.commit()
