from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import FeedbackEvent
from app.routers.profile import get_current_profile
from app.schemas import FeedbackIn

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


@router.post("", status_code=201)
def log_event(event: FeedbackIn, db: Session = Depends(get_db)):
    profile = get_current_profile(db)
    if not profile:
        raise HTTPException(status_code=404, detail="No profile yet")
    db.add(FeedbackEvent(profile_id=profile.id, job_id=event.job_id, event_type=event.event_type))
    db.commit()
    return {"status": "logged"}
