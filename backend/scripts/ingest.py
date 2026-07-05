"""Run the job ingestion pipeline.

Usage (from backend/):
    python -m scripts.ingest                          # all configured sources
    python -m scripts.ingest --source zaplata.bg      # one source
    python -m scripts.ingest --limit 200              # per-source cap

Scheduling (spec: every 2 days initially): run this from Windows Task Scheduler
/ cron / a scheduled container. It is idempotent — known ads are refreshed,
not duplicated, and ads gone from all sources get deactivated after
INGEST_STALE_DAYS.
"""

import argparse
import logging

import truststore

truststore.inject_into_ssl()  # use the OS certificate store (fixes Windows SSL verification)

from app.db import SessionLocal, init_db
from app.ingestion.pipeline import run_ingestion

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


def main() -> None:
    parser = argparse.ArgumentParser(description="JobMatch AI ingestion pipeline")
    parser.add_argument("--source", action="append", dest="sources",
                        help="source name (repeatable); default: all")
    parser.add_argument("--limit", type=int, default=100, help="max ads per source (default 100)")
    args = parser.parse_args()

    init_db()
    with SessionLocal() as db:
        results = run_ingestion(db, sources=args.sources, limit=args.limit)

    print(f"\n{'source':<14}{'fetched':>8}{'new':>6}{'merged':>8}{'refreshed':>11}{'errors':>8}")
    for name, s in results.items():
        print(f"{name:<14}{s.fetched:>8}{s.new:>6}{s.merged:>8}{s.refreshed:>11}{s.errors:>8}")
        for note in s.notes:
            print(f"  ! {note}")


if __name__ == "__main__":
    main()
