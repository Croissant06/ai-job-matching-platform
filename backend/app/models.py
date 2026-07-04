import uuid
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.config import get_settings
from app.db import Base

EMBED_DIM = get_settings().embedding_dim


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Job(Base):
    """Canonical job ad. In the full product this gains child source_postings
    (one per aggregator/scraped site) for deduplication; the slice has one source."""

    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source: Mapped[str] = mapped_column(String(50), default="seed")
    external_url: Mapped[str | None] = mapped_column(String(500))

    title: Mapped[str] = mapped_column(String(300))
    company: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text)
    language: Mapped[str] = mapped_column(String(5), default="en")  # bg / en / ro

    country: Mapped[str] = mapped_column(String(2))  # ISO code
    region: Mapped[str | None] = mapped_column(String(100))
    city: Mapped[str | None] = mapped_column(String(100))

    workplace: Mapped[str] = mapped_column(String(20), default="onsite")  # onsite/remote/hybrid
    employment_type: Mapped[str] = mapped_column(String(20), default="full_time")
    seniority: Mapped[str | None] = mapped_column(String(20))  # intern/junior/mid/senior/management

    salary_min: Mapped[int | None] = mapped_column(Integer)
    salary_max: Mapped[int | None] = mapped_column(Integer)
    salary_currency: Mapped[str | None] = mapped_column(String(5))

    skills: Mapped[list] = mapped_column(JSONB, default=list)

    posted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    embedding: Mapped[list] = mapped_column(Vector(EMBED_DIM))


class CandidateProfile(Base):
    """Single demo profile in the slice; becomes per-user once auth lands.
    `version` bumps on every edit so cached explanations invalidate."""

    __tablename__ = "candidate_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version: Mapped[int] = mapped_column(Integer, default=1)

    full_name: Mapped[str | None] = mapped_column(String(200))
    email: Mapped[str | None] = mapped_column(String(200))
    phone: Mapped[str | None] = mapped_column(String(50))
    country: Mapped[str | None] = mapped_column(String(2))
    city: Mapped[str | None] = mapped_column(String(100))

    seniority: Mapped[str | None] = mapped_column(String(20))
    years_experience: Mapped[float | None] = mapped_column(Float)
    roles: Mapped[list] = mapped_column(JSONB, default=list)
    skills: Mapped[list] = mapped_column(JSONB, default=list)
    languages: Mapped[list] = mapped_column(JSONB, default=list)
    summary: Mapped[str | None] = mapped_column(Text)

    cv_text: Mapped[str | None] = mapped_column(Text)
    embedding: Mapped[list] = mapped_column(Vector(EMBED_DIM))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class JobExplanation(Base):
    """LLM match explanation + gap analysis, cached per (job, profile version, locale)."""

    __tablename__ = "job_explanations"
    __table_args__ = (
        UniqueConstraint("job_id", "profile_id", "profile_version", "locale", name="uq_explanation"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))
    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("candidate_profiles.id", ondelete="CASCADE"))
    profile_version: Mapped[int] = mapped_column(Integer)
    locale: Mapped[str] = mapped_column(String(5), default="en")

    explanation: Mapped[str] = mapped_column(Text)
    missing_skills: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class FeedbackEvent(Base):
    """Append-only interaction log — the raw material for phase-3 self-learning
    ranking. Logged from day 1 because it cannot be backfilled."""

    __tablename__ = "feedback_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("candidate_profiles.id", ondelete="CASCADE"))
    job_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"))
    event_type: Mapped[str] = mapped_column(String(20))  # impression/click/save/hide/apply
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
