"""Jooble API connector (layer A — legal aggregator).

Free key: https://jooble.org/api/about . Jooble covers Bulgaria and Romania
(JOOBLE_COUNTRIES, default "bg,ro"), which Adzuna does not — together they
give all three target markets. Jooble republishes ads from local boards
incl. some jobs.bg content, which we deliberately do not scrape directly.
"""

import re
from datetime import datetime
from typing import Iterator

import httpx

from app.config import get_settings
from app.ingestion.base import RawJob
from app.ingestion.http import post_with_retry, safe_external_id

_TAG_RE = re.compile(r"<[^>]+>")


class JoobleConnector:
    name = "jooble"

    def is_configured(self) -> bool:
        return bool(get_settings().jooble_api_key)

    def fetch(self, limit: int, known_ids: frozenset[str]) -> Iterator[RawJob]:
        s = get_settings()
        countries = [c.strip().lower() for c in s.jooble_countries.split(",") if c.strip()]
        per_country = max(limit // max(len(countries), 1), 20)

        with httpx.Client(timeout=30) as client:
            for country in countries:
                yielded = 0
                page = 1
                while yielded < per_country:
                    resp = post_with_retry(
                        client,
                        f"https://{country}.jooble.org/api/{s.jooble_api_key}",
                        json={"keywords": "", "location": "", "page": str(page)},
                    )
                    jobs = resp.json().get("jobs", [])
                    if not jobs:
                        break
                    for item in jobs:
                        posted = None
                        if item.get("updated"):
                            try:
                                posted = datetime.fromisoformat(item["updated"])
                            except ValueError:
                                pass
                        yield RawJob(
                            source=self.name,
                            external_id=safe_external_id(str(item.get("id") or item.get("link", ""))),
                            url=item.get("link", ""),
                            title=_TAG_RE.sub("", item.get("title", "")),
                            company=item.get("company", ""),
                            description=_TAG_RE.sub(" ", item.get("snippet", "")).strip(),
                            city_raw=item.get("location"),
                            country=country.upper(),
                            salary_text=item.get("salary") or None,
                            employment_raw=item.get("type") or None,
                            posted_at=posted,
                        )
                        yielded += 1
                        if yielded >= per_country:
                            break
                    page += 1
