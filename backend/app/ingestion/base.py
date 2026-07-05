"""Connector contract: every source module yields RawJob in one unified shape,
so a broken connector never affects the others (spec §3.2 modular architecture)."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Iterator, Protocol


@dataclass
class RawJob:
    source: str
    external_id: str
    url: str
    title: str
    company: str
    description: str
    city_raw: str | None = None  # as the source spells it; normalize.py canonicalizes
    country: str | None = None  # ISO-2 when the source knows it
    salary_min: int | None = None
    salary_max: int | None = None
    salary_currency: str | None = None
    salary_text: str | None = None  # free-text salary; parsed when min/max absent
    employment_raw: str | None = None  # free-text employment/work-type hints
    workplace_raw: str | None = None
    posted_at: datetime | None = None
    tags: list[str] = field(default_factory=list)


class Connector(Protocol):
    name: str

    def is_configured(self) -> bool:
        """False when required API keys are missing — the pipeline skips with a notice."""
        ...

    def fetch(self, limit: int, known_ids: frozenset[str]) -> Iterator[RawJob]:
        """Yield up to `limit` jobs. `known_ids` are external_ids already stored —
        scrapers should skip fetching those pages entirely (saves requests and
        stays polite); API connectors may ignore it (one request covers many ads)."""
        ...
