"""Normalize RawJob into the canonical Job schema.

Sources spell everything differently ("София" / "Sofia" / "гр.София",
"Пълен работен ден" / "full time"); matching and filters only work if the
database speaks one language. Everything unknown stays None — neutral for
scoring — rather than guessed wrong.
"""

import hashlib
import re
from datetime import datetime, timedelta, timezone

from app.ingestion.base import RawJob

# --- Cities -----------------------------------------------------------------
# slug/Cyrillic/local spelling -> (canonical English name, ISO country)
CITY_MAP: dict[str, tuple[str, str]] = {
    # Bulgaria
    "sofia": ("Sofia", "BG"), "софия": ("Sofia", "BG"),
    "plovdiv": ("Plovdiv", "BG"), "пловдив": ("Plovdiv", "BG"),
    "varna": ("Varna", "BG"), "варна": ("Varna", "BG"),
    "burgas": ("Burgas", "BG"), "бургас": ("Burgas", "BG"),
    "ruse": ("Ruse", "BG"), "русе": ("Ruse", "BG"),
    "stara-zagora": ("Stara Zagora", "BG"), "стара загора": ("Stara Zagora", "BG"),
    "veliko-tarnovo": ("Veliko Tarnovo", "BG"), "велико търново": ("Veliko Tarnovo", "BG"),
    "pleven": ("Pleven", "BG"), "плевен": ("Pleven", "BG"),
    "montana": ("Montana", "BG"), "монтана": ("Montana", "BG"),
    "dobrich": ("Dobrich", "BG"), "добрич": ("Dobrich", "BG"),
    "sliven": ("Sliven", "BG"), "сливен": ("Sliven", "BG"),
    "shumen": ("Shumen", "BG"), "шумен": ("Shumen", "BG"),
    "haskovo": ("Haskovo", "BG"), "хасково": ("Haskovo", "BG"),
    "blagoevgrad": ("Blagoevgrad", "BG"), "благоевград": ("Blagoevgrad", "BG"),
    "pazardzhik": ("Pazardzhik", "BG"), "пазарджик": ("Pazardzhik", "BG"),
    # Romania
    "bucuresti": ("Bucharest", "RO"), "bucurești": ("Bucharest", "RO"), "bucharest": ("Bucharest", "RO"),
    "cluj-napoca": ("Cluj-Napoca", "RO"), "cluj": ("Cluj-Napoca", "RO"),
    "timisoara": ("Timisoara", "RO"), "timișoara": ("Timisoara", "RO"),
    "iasi": ("Iasi", "RO"), "iași": ("Iasi", "RO"),
    "brasov": ("Brasov", "RO"), "brașov": ("Brasov", "RO"),
    "constanta": ("Constanta", "RO"), "constanța": ("Constanta", "RO"),
    # UK (Adzuna international layer)
    "london": ("London", "GB"), "manchester": ("Manchester", "GB"),
}

_CITY_PREFIX = re.compile(r"^(гр\.|с\.|oras\s|or\.)\s*", re.IGNORECASE)


def normalize_city(raw: str | None) -> tuple[str | None, str | None]:
    """Returns (canonical city, ISO country guess)."""
    if not raw:
        return None, None
    cleaned = _CITY_PREFIX.sub("", raw.strip()).strip()
    key = cleaned.lower().replace("_", "-")
    if key in CITY_MAP:
        return CITY_MAP[key]
    # "Sofia, Bulgaria" / "London, UK" style values: try the first component.
    first = key.split(",")[0].strip()
    if first in CITY_MAP:
        return CITY_MAP[first]
    return cleaned.title() if cleaned else None, None


# --- Language ----------------------------------------------------------------
_RO_DIACRITICS = set("ăâîșțĂÂÎȘȚ")


def detect_language(text: str) -> str:
    sample = text[:2000]
    if not sample:
        return "en"
    cyrillic = sum(1 for ch in sample if "Ѐ" <= ch <= "ӿ")
    if cyrillic / max(len(sample), 1) > 0.15:
        return "bg"
    if sum(1 for ch in sample if ch in _RO_DIACRITICS) >= 3:
        return "ro"
    return "en"


# --- Enums from keywords -------------------------------------------------------
_SENIORITY_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("intern", re.compile(r"\b(intern(ship)?|стажант|стаж|stagiar|trainee)\b", re.I)),
    ("management", re.compile(r"\b(manager|мениджър|ръководител|director|директор|head of|team lead)\b", re.I)),
    ("senior", re.compile(r"\b(senior|старши|sr\.?)\b", re.I)),
    ("junior", re.compile(r"\b(junior|младши|jr\.?|entry[- ]level)\b", re.I)),
]


def infer_seniority(title: str, description: str) -> str | None:
    for level, pattern in _SENIORITY_PATTERNS:
        if pattern.search(title):
            return level
    for level, pattern in _SENIORITY_PATTERNS:
        if pattern.search(description[:1500]):
            return level
    return None


_REMOTE = re.compile(
    r"(remote|дистанционн|работа от (вкъщи|разстояние)|home\s?office|от дома|la distanță|telemunc)", re.I
)
_HYBRID = re.compile(r"(hybrid|хибрид)", re.I)


def infer_workplace(*texts: str | None) -> str:
    blob = " ".join(t for t in texts if t)
    if _HYBRID.search(blob):
        return "hybrid"
    if _REMOTE.search(blob):
        return "remote"
    return "onsite"


_PART_TIME = re.compile(
    r"(part[- ]?time|непълен работен ден|непълно работно време|почасов|4 часа|половин ден|jumătate de normă)",
    re.I,
)


def infer_employment(*texts: str | None) -> str:
    blob = " ".join(t for t in texts if t)
    return "part_time" if _PART_TIME.search(blob) else "full_time"


# --- Salary -------------------------------------------------------------------
_CURRENCIES = {"лв": "BGN", "lv": "BGN", "bgn": "BGN", "€": "EUR", "eur": "EUR", "lei": "RON", "ron": "RON", "£": "GBP", "gbp": "GBP"}
# "2238 - 2308 лв." / "от 1144 до 1180 €" / "1500 лв" / "3,000 - 4,000 EUR"
_SALARY_RANGE = re.compile(
    r"(?:от\s*)?([\d][\d\s.,]{2,})\s*(?:-|–|до)\s*([\d][\d\s.,]{2,})\s*(лв|lv|bgn|€|eur|lei|ron|£|gbp)",
    re.I,
)
_SALARY_SINGLE = re.compile(r"([\d][\d\s.,]{2,})\s*(лв|lv|bgn|€|eur|lei|ron|£|gbp)", re.I)


def _to_int(number_text: str) -> int | None:
    digits = re.sub(r"[^\d]", "", number_text)
    return int(digits) if digits else None


def parse_salary(text: str | None) -> tuple[int | None, int | None, str | None]:
    if not text:
        return None, None, None
    match = _SALARY_RANGE.search(text)
    if match:
        return _to_int(match.group(1)), _to_int(match.group(2)), _CURRENCIES.get(match.group(3).lower())
    match = _SALARY_SINGLE.search(text)
    if match:
        value = _to_int(match.group(1))
        return value, value, _CURRENCIES.get(match.group(2).lower())
    return None, None, None


# --- Fingerprint ----------------------------------------------------------------
def content_hash(company: str, title: str, city: str | None) -> str:
    def clean(s: str) -> str:
        return re.sub(r"[^\w]+", "", (s or "").lower())

    return hashlib.sha1(f"{clean(company)}|{clean(title)}|{clean(city or '')}".encode()).hexdigest()


# --- Entry point ------------------------------------------------------------------
def normalize(raw: RawJob) -> dict:
    """RawJob -> dict of canonical Job column values (embedding excluded)."""
    city, country_guess = normalize_city(raw.city_raw)
    country = (raw.country or country_guess or "BG").upper()

    salary_min, salary_max, currency = raw.salary_min, raw.salary_max, raw.salary_currency
    if salary_min is None and salary_max is None:
        salary_min, salary_max, currency = parse_salary(raw.salary_text)

    description = raw.description.strip()
    title = raw.title.strip()
    now = datetime.now(timezone.utc)

    return {
        "source": raw.source,
        "external_url": raw.url,
        "title": title[:300],
        "company": raw.company.strip()[:300] or "Unknown",
        "description": description[:8000],
        "language": detect_language(f"{title} {description}"),
        "country": country[:2],
        "region": None,
        "city": city,
        "workplace": infer_workplace(raw.workplace_raw, raw.employment_raw, title, description[:1500]),
        "employment_type": infer_employment(raw.employment_raw, title, description[:1500]),
        "seniority": infer_seniority(title, description),
        "salary_min": salary_min,
        "salary_max": salary_max,
        "salary_currency": currency,
        "skills": [t.strip().lower() for t in raw.tags if t.strip()][:15],
        "posted_at": raw.posted_at or now,
        "expires_at": now + timedelta(days=30),
        "last_seen_at": now,
        "is_active": True,
        "content_hash": content_hash(raw.company, title, city),
    }
