"""Duplicate detection for canonical jobs.

Two layers: exact fingerprint (company+title+city hash) catches the common
case of the same ad on several sources; embedding similarity restricted to
the same company catches reworded reposts. Company must match for the fuzzy
layer — similar wording across different employers is NOT a duplicate.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Job

# Cosine distance below this (same company) is treated as a reworded duplicate.
EMBEDDING_DUP_THRESHOLD = 0.05


def find_by_hash(db: Session, fingerprint: str) -> Job | None:
    return db.execute(
        select(Job).where(Job.content_hash == fingerprint, Job.is_active.is_(True))
    ).scalars().first()


def find_by_embedding(db: Session, company: str, embedding: list[float]) -> Job | None:
    distance = Job.embedding.cosine_distance(embedding)
    row = db.execute(
        select(Job, distance.label("distance"))
        .where(Job.company.ilike(company.strip()), Job.is_active.is_(True))
        .order_by(distance)
        .limit(1)
    ).first()
    if row and float(row.distance) < EMBEDDING_DUP_THRESHOLD:
        return row.Job
    return None
