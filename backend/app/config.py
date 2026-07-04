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


@lru_cache
def get_settings() -> Settings:
    return Settings()
