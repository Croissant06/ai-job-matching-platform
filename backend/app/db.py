from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


engine = create_engine(get_settings().database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

_BACKEND_DIR = Path(__file__).resolve().parent.parent


def run_migrations() -> None:
    """Apply Alembic migrations up to head. Replaces the old create_all —
    schema changes now ship as migration files instead of database resets."""
    from alembic import command
    from alembic.config import Config

    cfg = Config(str(_BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(_BACKEND_DIR / "alembic"))
    command.upgrade(cfg, "head")


def reset_database() -> None:
    """Development-only: wipe everything and rebuild from migrations."""
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    run_migrations()


def init_db() -> None:
    run_migrations()


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
