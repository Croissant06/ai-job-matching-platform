"""Seed the database with sample job ads (and optionally a demo candidate profile).

Usage (from backend/):
    python -m scripts.seed_jobs                    # jobs only
    python -m scripts.seed_jobs --demo-profile     # + demo candidate, so search works
                                                   #   without uploading a CV / API keys

In the real product this script's role is taken by the ingestion pipeline
(aggregator API connectors + scrapers -> normalize -> dedupe -> embed -> upsert).
"""

import argparse
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import delete

from app.db import SessionLocal, init_db
from app.models import CandidateProfile, Job
from app.services.embeddings import embed_texts, job_embedding_text, profile_embedding_text

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "seed_jobs.json"

DEMO_PROFILE = {
    "full_name": "Demo Candidate",
    "email": "demo@example.com",
    "country": "BG",
    "city": "Sofia",
    "seniority": "mid",
    "years_experience": 4,
    "roles": ["python developer", "backend developer"],
    "skills": ["python", "fastapi", "postgresql", "docker", "sql", "git", "rest api"],
    "languages": ["Bulgarian", "English"],
    "summary": "Backend developer with 4 years of experience building web services "
    "with Python and PostgreSQL, looking for a mid or senior role in Sofia or remote.",
}


def seed(with_demo_profile: bool) -> None:
    init_db()
    now = datetime.now(timezone.utc)
    raw = json.loads(DATA_FILE.read_text(encoding="utf-8"))

    texts = [job_embedding_text(j["title"], j["company"], j["skills"], j["description"]) for j in raw]
    print(f"Embedding {len(texts)} job ads...")
    vectors = embed_texts(texts)

    with SessionLocal() as db:
        db.execute(delete(Job).where(Job.source == "seed"))
        for item, vec in zip(raw, vectors):
            posted_days = item.pop("posted_days_ago", 0)
            db.add(
                Job(
                    **item,
                    source="seed",
                    posted_at=now - timedelta(days=posted_days),
                    expires_at=now + timedelta(days=30),
                    embedding=vec,
                )
            )

        if with_demo_profile:
            existing = db.query(CandidateProfile).first()
            if existing:
                print("A candidate profile already exists — skipping demo profile.")
            else:
                p = DEMO_PROFILE
                db.add(
                    CandidateProfile(
                        **p,
                        embedding=embed_texts(
                            [profile_embedding_text(p["roles"], p["skills"], p["seniority"], p["summary"])]
                        )[0],
                    )
                )
                print("Demo candidate profile created.")

        db.commit()
    print(f"Seeded {len(raw)} jobs.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--demo-profile", action="store_true")
    args = parser.parse_args()
    seed(with_demo_profile=args.demo_profile)
