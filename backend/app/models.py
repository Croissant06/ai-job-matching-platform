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
    # EUR-normalized copies so filters/scoring compare like with like across
    # BGN/GBP/RON sources (raw values above stay for display).
    salary_min_eur: Mapped[int | None] = mapped_column(Integer)
    salary_max_eur: Mapped[int | None] = mapped_column(Integer)

    skills: Mapped[list] = mapped_column(JSONB, default=list)

    posted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Ingestion bookkeeping: dedupe fingerprint + freshness for stale expiry.
    content_hash: Mapped[str | None] = mapped_column(String(40), index=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    embedding: Mapped[list] = mapped_column(Vector(EMBED_DIM))


class SourcePosting(Base):
    """One appearance of a canonical job on one source. The same ad seen on
    several sites becomes one Job with multiple SourcePostings, preserving
    every original link (spec §3.2 deduplication)."""

    __tablename__ = "source_postings"
    __table_args__ = (UniqueConstraint("source", "external_id", name="uq_source_posting"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    source: Mapped[str] = mapped_column(String(50), index=True)
    external_id: Mapped[str] = mapped_column(String(200))
    url: Mapped[str | None] = mapped_column(String(500))
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


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

    # Explicit search preferences (onboarding goal chips + profile page edits).
    preferred_countries: Mapped[list] = mapped_column(JSONB, default=list)
    preferred_cities: Mapped[list] = mapped_column(JSONB, default=list)
    preferred_workplaces: Mapped[list] = mapped_column(JSONB, default=list)
    preferred_employment_types: Mapped[list] = mapped_column(JSONB, default=list)
    target_seniorities: Mapped[list] = mapped_column(JSONB, default=list)
    relocation_ready: Mapped[bool] = mapped_column(Boolean, default=False)
    salary_expectation: Mapped[int | None] = mapped_column(Integer)  # monthly, local currency

    cv_text: Mapped[str | None] = mapped_column(Text)
    embedding: Mapped[list] = mapped_column(Vector(EMBED_DIM))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class SavedSearch(Base):
    """A reusable set of search filters ("relocation-ready" vs "only Ruse").
    `last_checked_at` drives the new-matches counter; `alerts_enabled` is stored
    now and consumed once email delivery exists."""

    __tablename__ = "saved_searches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("candidate_profiles.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(200))
    filters: Mapped[dict] = mapped_column(JSONB, default=dict)
    alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    last_checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


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
