"""Resilient HTTP for connectors.

Third-party APIs and sites throw transient errors (429 rate limits, 5xx,
network blips). Without retries, one blip aborts a source's entire scheduled
run and the data waits two days for the next one.
"""

import hashlib
import logging
import time

import httpx

logger = logging.getLogger("ingestion.http")

RETRIABLE_STATUS = {429, 500, 502, 503, 504}
MAX_ATTEMPTS = 3
BASE_BACKOFF = 1.5  # seconds; grows 1.5 -> 3 -> 6


def request_with_retry(client: httpx.Client, method: str, url: str, **kwargs) -> httpx.Response:
    """GET/POST with exponential backoff. Honors Retry-After on 429/503.
    Raises the last error after MAX_ATTEMPTS so callers still see hard failures."""
    last_exc: Exception | None = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            response = client.request(method, url, **kwargs)
            if response.status_code not in RETRIABLE_STATUS:
                response.raise_for_status()
                return response
            retry_after = response.headers.get("Retry-After")
            wait = float(retry_after) if retry_after and retry_after.isdigit() else BASE_BACKOFF * (2 ** (attempt - 1))
            last_exc = httpx.HTTPStatusError(
                f"HTTP {response.status_code}", request=response.request, response=response
            )
        except httpx.TransportError as exc:  # timeouts, connection resets, DNS
            wait = BASE_BACKOFF * (2 ** (attempt - 1))
            last_exc = exc
        if attempt < MAX_ATTEMPTS:
            logger.warning("retry %d/%d for %s in %.1fs (%s)", attempt, MAX_ATTEMPTS, url, wait, last_exc)
            time.sleep(wait)
    raise last_exc  # type: ignore[misc]


def get_with_retry(client: httpx.Client, url: str, **kwargs) -> httpx.Response:
    return request_with_retry(client, "GET", url, **kwargs)


def post_with_retry(client: httpx.Client, url: str, **kwargs) -> httpx.Response:
    return request_with_retry(client, "POST", url, **kwargs)


def safe_external_id(raw_id: str, max_length: int = 200) -> str:
    """Some sources use full URLs as ids; hash anything that would overflow the column."""
    return raw_id if len(raw_id) <= max_length else hashlib.sha1(raw_id.encode()).hexdigest()
