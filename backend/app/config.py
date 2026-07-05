from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://jobmatch:jobmatch@localhost:5433/jobmatch"

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-haiku-4-5-20251001"

    embedding_provider: str = "mock"  # "voyage" | "mock"
    voyage_api_key: str = ""
    voyage_model: str = "voyage-3.5"
    embedding_dim: int = 1024

    cors_origins: str = "http://localhost:3000"

    # Ingestion — layer A: aggregator APIs (free keys; connectors skip when unset).
    adzuna_app_id: str = ""
    adzuna_app_key: str = ""
    adzuna_countries: str = "gb"  # Adzuna has no BG/RO coverage; serves the international market
    jooble_api_key: str = ""
    jooble_countries: str = "bg,ro"

    # Ingestion — layer B: own scrapers.
    scraper_user_agent: str = (
        "JobMatchAI/0.1 (+https://github.com/Croissant06/ai-job-matching-platform)"
    )
    scraper_delay_seconds: float = 1.5
    ingest_stale_days: int = 7  # deactivate ingested jobs unseen for this many days


@lru_cache
def get_settings() -> Settings:
    return Settings()
