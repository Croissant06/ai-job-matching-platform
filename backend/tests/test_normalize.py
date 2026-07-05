"""Unit tests for ingestion normalization — the pure functions where a source
site's format change would otherwise silently corrupt data."""

from datetime import datetime, timezone

from app.ingestion.base import RawJob
from app.ingestion.normalize import (
    content_hash,
    detect_language,
    infer_employment,
    infer_seniority,
    infer_workplace,
    normalize,
    normalize_city,
    parse_salary,
    to_eur,
)


class TestParseSalary:
    def test_bgn_range_with_dash(self):
        assert parse_salary("2238 - 2308 лв.") == (2238, 2308, "BGN")

    def test_bulgarian_ot_do_eur(self):
        assert parse_salary("Заплата от 1144 до 1180 € бруто") == (1144, 1180, "EUR")

    def test_single_value(self):
        assert parse_salary("3130 лв") == (3130, 3130, "BGN")

    def test_thousands_separators(self):
        assert parse_salary("3,000 - 4,000 EUR") == (3000, 4000, "EUR")

    def test_romanian_lei(self):
        assert parse_salary("5000 - 7000 lei") == (5000, 7000, "RON")

    def test_no_salary(self):
        assert parse_salary("Competitive remuneration") == (None, None, None)

    def test_none_input(self):
        assert parse_salary(None) == (None, None, None)


class TestToEur:
    def test_bgn_statutory_rate(self):
        assert to_eur(1956, "BGN") == 1000

    def test_eur_identity(self):
        assert to_eur(1500, "EUR") == 1500

    def test_unknown_currency_returns_none(self):
        assert to_eur(1000, "XYZ") is None

    def test_none_amount(self):
        assert to_eur(None, "BGN") is None


class TestNormalizeCity:
    def test_cyrillic(self):
        assert normalize_city("София") == ("Sofia", "BG")

    def test_slug(self):
        assert normalize_city("veliko-tarnovo") == ("Veliko Tarnovo", "BG")

    def test_gr_prefix(self):
        assert normalize_city("гр.София") == ("Sofia", "BG")

    def test_city_country_pair(self):
        assert normalize_city("Sofia, Bulgaria") == ("Sofia", "BG")

    def test_romanian_diacritics(self):
        assert normalize_city("București") == ("Bucharest", "RO")

    def test_unknown_city_passes_through_titlecased(self):
        city, country = normalize_city("kostinbrod")
        assert city == "Kostinbrod"
        assert country is None

    def test_none(self):
        assert normalize_city(None) == (None, None)


class TestDetectLanguage:
    def test_bulgarian(self):
        assert detect_language("Търсим търговски представител за регион Русе") == "bg"

    def test_english(self):
        assert detect_language("We are looking for a Senior Python Developer") == "en"

    def test_romanian(self):
        assert detect_language("Căutăm un inginer software cu experiență în București") == "ro"


class TestInference:
    def test_seniority_title_beats_description(self):
        assert infer_seniority("Senior Developer", "junior team") == "senior"

    def test_seniority_bulgarian(self):
        assert infer_seniority("Старши счетоводител", "") == "senior"
        assert infer_seniority("Стажант програмист", "") == "intern"

    def test_seniority_manager(self):
        assert infer_seniority("Мениджър продажби", "") == "management"

    def test_seniority_unknown_is_none(self):
        assert infer_seniority("Учител", "работа в детска градина") is None

    def test_workplace_remote_bulgarian(self):
        assert infer_workplace("работа от вкъщи") == "remote"

    def test_workplace_hybrid_wins_over_remote(self):
        assert infer_workplace("hybrid role, partly remote") == "hybrid"

    def test_workplace_default_onsite(self):
        assert infer_workplace("office in Sofia") == "onsite"

    def test_employment_part_time_bulgarian(self):
        assert infer_employment("непълен работен ден") == "part_time"

    def test_employment_default_full_time(self):
        assert infer_employment("Пълен Работен Ден Постоянна") == "full_time"


class TestContentHash:
    def test_stable_across_formatting(self):
        a = content_hash("Chaos Group", "Senior Python Developer", "Sofia")
        b = content_hash("  chaos group ", "SENIOR   PYTHON-DEVELOPER", "sofia")
        assert a == b

    def test_different_city_differs(self):
        assert content_hash("X", "Dev", "Sofia") != content_hash("X", "Dev", "Varna")


class TestNormalizeEndToEnd:
    def _raw(self, **overrides) -> RawJob:
        base = dict(
            source="test",
            external_id="1",
            url="https://example.com/1",
            title="Старши Python разработчик",
            company="Тест ЕООД",
            description="Търсим разработчик с опит. Работа от вкъщи. 2238 - 2308 лв.",
            city_raw="софия",
            salary_text="2238 - 2308 лв.",
            tags=["ИТ", "python"],
        )
        base.update(overrides)
        return RawJob(**base)

    def test_full_normalization(self):
        norm = normalize(self._raw())
        assert norm["city"] == "Sofia"
        assert norm["country"] == "BG"
        assert norm["language"] == "bg"
        assert norm["seniority"] == "senior"
        assert norm["workplace"] == "remote"
        assert norm["salary_min"] == 2238
        assert norm["salary_currency"] == "BGN"
        assert norm["salary_max_eur"] == round(2308 / 1.95583)
        assert norm["is_active"] is True
        assert norm["content_hash"]
        assert isinstance(norm["posted_at"], datetime)
        assert norm["posted_at"].tzinfo == timezone.utc

    def test_explicit_salary_beats_text(self):
        norm = normalize(self._raw(salary_min=1000, salary_max=2000, salary_currency="EUR"))
        assert norm["salary_max"] == 2000
        assert norm["salary_max_eur"] == 2000
