"""Adzuna API connector (layer A — legal aggregator).

Free keys: https://developer.adzuna.com/ . Adzuna does not cover BG/RO, so this
connector serves the international/English market (countries via
ADZUNA_COUNTRIES, e.g. "gb,de,nl").
"""

from datetime import datetime
from typing import Iterator

import httpx

from app.config import get_settings
from app.ingestion.base import RawJob

PAGE_SIZE = 50


class AdzunaConnector:
    name = "adzuna"

    def is_configured(self) -> bool:
        s = get_settings()
        return bool(s.adzuna_app_id and s.adzuna_app_key)

    def fetch(self, limit: int, known_ids: frozenset[str]) -> Iterator[RawJob]:
        s = get_settings()
        countries = [c.strip().lower() for c in s.adzuna_countries.split(",") if c.strip()]
        per_country = max(limit // max(len(countries), 1), PAGE_SIZE)

        with httpx.Client(timeout=30) as client:
            for country in countries:
                yielded = 0
                page = 1
                while yielded < per_country:
                    resp = client.get(
                        f"https://api.adzuna.com/v1/api/jobs/{country}/search/{page}",
                        params={
                            "app_id": s.adzuna_app_id,
                            "app_key": s.adzuna_app_key,
                            "results_per_page": PAGE_SIZE,
                            "content-type": "application/json",
                        },
                    )
                    resp.raise_for_status()
                    results = resp.json().get("results", [])
                    if not results:
                        break
                    for item in results:
                        posted = None
                        if item.get("created"):
                            try:
                                posted = datetime.fromisoformat(item["created"].replace("Z", "+00:00"))
                            except ValueError:
                                pass
                        yield RawJob(
                            source=self.name,
                            external_id=str(item["id"]),
                            url=item.get("redirect_url", ""),
                            title=item.get("title", "").replace("<strong>", "").replace("</strong>", ""),
                            company=(item.get("company") or {}).get("display_name", ""),
                            description=item.get("description", ""),
                            city_raw=(item.get("location") or {}).get("display_name"),
                            country=country.upper(),
                            salary_min=int(item["salary_min"]) if item.get("salary_min") else None,
                            salary_max=int(item["salary_max"]) if item.get("salary_max") else None,
                            salary_currency="GBP" if country == "gb" else "EUR",
                            employment_raw=item.get("contract_time"),
                            posted_at=posted,
                            tags=[(item.get("category") or {}).get("label", "")],
                        )
                        yielded += 1
                        if yielded >= per_country:
                            break
                    page += 1
