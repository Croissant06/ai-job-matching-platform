"""zaplata.bg scraper (layer B — own connector).

Compliance: robots.txt disallows /search/ and candidate pages; we never touch
those. Discovery goes through the published sitemap (sitemaps exist to be
crawled), fetching only individual ad pages, rate-limited, with an honest
User-Agent. Already-known ads are skipped without any HTTP request.

Ad page anatomy (verified 2026-07):
  h1                      -> title
  .info .title span       -> company
  .info .params a.location-> "гр.София"
  .info .params a links   -> employment/type labels ("Пълен Работен Ден", ...)
  span.salary             -> "Заплата от 1144 до 1180 € бруто (2238 - 2308 лв.)"
  .advert_description     -> description text
  .info .date .view       -> "11 Юни 2026<strong>218</strong>" (date + view count)
  .tags a                 -> tag links
"""

import logging
import re
import time
from datetime import datetime, timezone
from typing import Iterator
from xml.etree import ElementTree

import httpx
from bs4 import BeautifulSoup

from app.config import get_settings
from app.ingestion.base import RawJob
from app.ingestion.normalize import parse_salary

logger = logging.getLogger("ingestion.zaplata")

SITEMAP_INDEX = "https://www.zaplata.bg/sitemap.xml"
_SITEMAP_NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"

# https://www.zaplata.bg/{category}/{city}/{id}/{slug}/
_AD_URL = re.compile(r"zaplata\.bg/([^/]+)/([^/]+)/(\d+)/[^/]+/?$")

_BG_MONTHS = {
    "януари": 1, "февруари": 2, "март": 3, "април": 4, "май": 5, "юни": 6,
    "юли": 7, "август": 8, "септември": 9, "октомври": 10, "ноември": 11, "декември": 12,
}
_DATE_RE = re.compile(r"(\d{1,2})\s+([А-Яа-я]+)\s+(\d{4})")


def _parse_bg_date(text: str) -> datetime | None:
    match = _DATE_RE.search(text)
    if not match:
        return None
    month = _BG_MONTHS.get(match.group(2).lower())
    if not month:
        return None
    try:
        return datetime(int(match.group(3)), month, int(match.group(1)), tzinfo=timezone.utc)
    except ValueError:
        return None


class ZaplataConnector:
    name = "zaplata.bg"

    def is_configured(self) -> bool:
        return True  # no credentials needed

    def _client(self) -> httpx.Client:
        return httpx.Client(
            timeout=30,
            headers={"User-Agent": get_settings().scraper_user_agent},
            follow_redirects=True,
        )

    def _ad_urls(self, client: httpx.Client) -> Iterator[tuple[str, str, str]]:
        """Yields (url, external_id, city_slug) from the ads sitemaps."""
        index = ElementTree.fromstring(client.get(SITEMAP_INDEX).content)
        ad_sitemaps = [
            loc.text
            for loc in index.iter(f"{_SITEMAP_NS}loc")
            if loc.text and "sitemap-ads" in loc.text
        ]
        for sitemap_url in ad_sitemaps:
            sitemap = ElementTree.fromstring(client.get(sitemap_url).content)
            for loc in sitemap.iter(f"{_SITEMAP_NS}loc"):
                if not loc.text:
                    continue
                match = _AD_URL.search(loc.text)
                if match:
                    yield loc.text, match.group(3), match.group(2)

    def _parse_ad(self, html: str, url: str, external_id: str, city_slug: str) -> RawJob | None:
        soup = BeautifulSoup(html, "lxml")

        title_el = soup.select_one(".main .text h1") or soup.find("h1")
        if not title_el:
            return None
        title = title_el.get_text(strip=True)

        company_el = soup.select_one(".info .title span") or soup.select_one(".comanyName a")
        company = company_el.get_text(strip=True) if company_el else ""

        description_el = soup.select_one(".advert_description")
        description = description_el.get_text(" ", strip=True) if description_el else ""

        salary_el = soup.select_one("span.salary")
        salary_min = salary_max = None
        currency = None
        if salary_el:
            salary_text = salary_el.get_text(" ", strip=True)
            # Prefer the BGN figure in parentheses; fall back to the leading (EUR) range.
            bgn = re.search(r"\(([^)]*лв[^)]*)\)", salary_text)
            salary_min, salary_max, currency = parse_salary(bgn.group(1) if bgn else salary_text)

        param_labels = [a.get_text(strip=True) for a in soup.select(".info .params a")]
        employment_raw = " ".join(param_labels)

        date_el = soup.select_one(".info .date .view")
        posted_at = _parse_bg_date(date_el.get_text(" ", strip=True)) if date_el else None

        tags = [a.get_text(strip=True) for a in soup.select(".tags a")]

        return RawJob(
            source=self.name,
            external_id=external_id,
            url=url,
            title=title,
            company=company,
            description=description,
            city_raw=city_slug,
            country="BG",
            salary_min=salary_min,
            salary_max=salary_max,
            salary_currency=currency,
            employment_raw=employment_raw,
            posted_at=posted_at,
            tags=tags,
        )

    def fetch(self, limit: int, known_ids: frozenset[str]) -> Iterator[RawJob]:
        delay = get_settings().scraper_delay_seconds
        yielded = 0
        # Ads still listed in the sitemap are alive: record known ones so the
        # pipeline can refresh last_seen_at without fetching their pages —
        # otherwise stale-expiry would deactivate ads that are still online.
        self.seen_known_ids: set[str] = set()
        with self._client() as client:
            for url, external_id, city_slug in self._ad_urls(client):
                if external_id in known_ids:
                    self.seen_known_ids.add(external_id)
                    continue  # no request spent on ads we already have
                if yielded >= limit:
                    continue  # keep scanning the sitemap for known ids only
                time.sleep(delay)
                try:
                    resp = client.get(url)
                    if resp.status_code != 200:
                        logger.warning("skipping %s (HTTP %s)", url, resp.status_code)
                        continue
                    raw = self._parse_ad(resp.text, url, external_id, city_slug)
                except httpx.HTTPError as exc:
                    logger.warning("skipping %s (%s)", url, exc)
                    continue
                if raw:
                    yield raw
                    yielded += 1
