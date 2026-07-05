"""Ingestion pipeline: fetch -> normalize -> dedupe -> embed -> upsert -> expire.

Each connector runs isolated: one source failing (site redesign, API outage)
logs an error and the rest continue — the error count is the spec's
"notification when a connector breaks" in its simplest useful form.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.config import get_settings
from app.ingestion import dedupe
from app.ingestion.base import RawJob
from app.ingestion.connectors import get_connectors
from app.ingestion.normalize import normalize
from app.models import Job, SourcePosting
from app.services.embeddings import embed_texts, job_embedding_text

logger = logging.getLogger("ingestion")

EMBED_BATCH = 64


@dataclass
class SourceStats:
    fetched: int = 0
    new: int = 0
    refreshed: int = 0
    merged: int = 0
    errors: int = 0
    notes: list[str] = field(default_factory=list)


def _refresh(job: Job, posting: SourcePosting, now: datetime) -> None:
    posting.last_seen_at = now
    job.last_seen_at = now
    job.expires_at = now + timedelta(days=30)
    job.is_active = True


def _process_source(db: Session, source: str, raws: list[RawJob], stats: SourceStats) -> None:
    now = datetime.now(timezone.utc)
    pending: list[tuple[RawJob, dict]] = []  # need embedding before insert

    for raw in raws:
        try:
            posting = db.execute(
                select(SourcePosting).where(
                    SourcePosting.source == raw.source,
                    SourcePosting.external_id == raw.external_id,
                )
            ).scalars().first()
            if posting:
                job = db.get(Job, posting.job_id)
                if job:
                    _refresh(job, posting, now)
                    stats.refreshed += 1
                continue

            norm = normalize(raw)
            existing = dedupe.find_by_hash(db, norm["content_hash"])
            if existing:
                new_posting = SourcePosting(
                    job_id=existing.id,
                    source=raw.source,
                    external_id=raw.external_id,
                    url=raw.url,
                    posted_at=raw.posted_at,
                )
                db.add(new_posting)
                _refresh(existing, new_posting, now)
                stats.merged += 1
                continue

            pending.append((raw, norm))
        except Exception as exc:  # one bad ad must not kill the batch
            stats.errors += 1
            logger.warning("%s: failed to process %s: %s", source, raw.external_id, exc)

    # Embed genuinely-new jobs in batches, then insert with a fuzzy-dup check.
    for start in range(0, len(pending), EMBED_BATCH):
        batch = pending[start : start + EMBED_BATCH]
        vectors = embed_texts(
            [
                job_embedding_text(n["title"], n["company"], n["skills"], n["description"])
                for _, n in batch
            ]
        )
        for (raw, norm), vector in zip(batch, vectors):
            try:
                fuzzy = dedupe.find_by_embedding(db, norm["company"], vector)
                if fuzzy:
                    new_posting = SourcePosting(
                        job_id=fuzzy.id,
                        source=raw.source,
                        external_id=raw.external_id,
                        url=raw.url,
                        posted_at=raw.posted_at,
                    )
                    db.add(new_posting)
                    _refresh(fuzzy, new_posting, now)
                    stats.merged += 1
                    continue
                job = Job(**norm, embedding=vector)
                db.add(job)
                db.flush()  # job.id needed for the posting row
                db.add(
                    SourcePosting(
                        job_id=job.id,
                        source=raw.source,
                        external_id=raw.external_id,
                        url=raw.url,
                        posted_at=raw.posted_at,
                    )
                )
                stats.new += 1
            except Exception as exc:
                stats.errors += 1
                logger.warning("%s: failed to insert %s: %s", source, raw.external_id, exc)

    db.commit()


def _refresh_known(db: Session, source: str, external_ids: set[str]) -> int:
    now = datetime.now(timezone.utc)
    postings = db.execute(
        select(SourcePosting).where(
            SourcePosting.source == source, SourcePosting.external_id.in_(external_ids)
        )
    ).scalars().all()
    job_ids = {p.job_id for p in postings}
    for posting in postings:
        posting.last_seen_at = now
    if job_ids:
        db.execute(
            update(Job)
            .where(Job.id.in_(job_ids))
            .values(last_seen_at=now, expires_at=now + timedelta(days=30), is_active=True)
        )
    db.commit()
    return len(postings)


def expire_stale(db: Session) -> int:
    """Deactivate ingested jobs that vanished from every source. Seeded sample
    jobs are exempt so local demo data survives ingestion runs."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=get_settings().ingest_stale_days)
    result = db.execute(
        update(Job)
        .where(Job.is_active.is_(True), Job.source != "seed", Job.last_seen_at < cutoff)
        .values(is_active=False)
    )
    db.commit()
    return result.rowcount


def run_ingestion(
    db: Session, sources: list[str] | None = None, limit: int = 100
) -> dict[str, SourceStats]:
    results: dict[str, SourceStats] = {}

    for connector in get_connectors(sources):
        stats = results.setdefault(connector.name, SourceStats())
        if not connector.is_configured():
            stats.notes.append("skipped — missing API credentials in .env")
            continue

        known = frozenset(
            db.execute(
                select(SourcePosting.external_id).where(SourcePosting.source == connector.name)
            ).scalars()
        )
        raws: list[RawJob] = []
        try:
            for raw in connector.fetch(limit, known):
                raws.append(raw)
        except Exception as exc:  # connector broke mid-run — keep what we got
            stats.errors += 1
            stats.notes.append(f"fetch aborted: {exc}")
            logger.error("%s: fetch failed: %s", connector.name, exc)

        stats.fetched = len(raws)
        _process_source(db, connector.name, raws, stats)

        # Scrapers report known ads still listed at the source (seen in the
        # sitemap without page fetches) — refresh their freshness in bulk.
        seen_known: set[str] = getattr(connector, "seen_known_ids", None) or set()
        if seen_known:
            stats.refreshed += _refresh_known(db, connector.name, seen_known)

    expired = expire_stale(db)
    if expired:
        logger.info("expired %d stale jobs", expired)
    return results
