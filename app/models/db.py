from typing import Iterator
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text, inspect as sa_inspect

from app.core.config import get_settings


def _build_database_url() -> str:
    settings = get_settings()
    missing = [
        name for name, val in (
            ("PG_HOST", settings.pg_host),
            ("PG_PORT", settings.pg_port),
            ("PG_USER", settings.pg_user),
            ("PG_PASSWORD", settings.pg_password),
            ("PG_DB", settings.pg_db),
        )
        if val in (None, "")
    ]
    if missing:
        raise RuntimeError(
            f"PostgreSQL settings missing: {', '.join(missing)}. This project requires PostgreSQL with pgvector."
        )
    return (
        f"postgresql+psycopg://{settings.pg_user}:{settings.pg_password}"
        f"@{settings.pg_host}:{settings.pg_port}/{settings.pg_db}"
    )


settings = get_settings()
engine = create_engine(_build_database_url(), echo=False, future=True)


def create_db_and_tables() -> None:
    # Import vector entities to register tables
    try:
        from app.models import vector_entities  # noqa: F401
    except Exception:
        pass
    # Always ensure pgvector extension for PostgreSQL
    with engine.connect() as conn:
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
        except Exception:
            conn.rollback()
    SQLModel.metadata.create_all(engine)
    _run_light_migrations()


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session


def _run_light_migrations() -> None:
    """Best-effort, idempotent column additions for backward compatibility.
    Avoids full Alembic setup by adding missing columns dynamically.
    """
    try:
        with engine.begin() as conn:
            insp = sa_inspect(conn)
            if "jobposting" in insp.get_table_names():
                existing_cols = {col["name"] for col in insp.get_columns("jobposting")}
                dialect = conn.dialect.name

                if "status" not in existing_cols:
                    if dialect.startswith("postgres"):
                        conn.execute(text("ALTER TABLE jobposting ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft'"))
                    else:
                        conn.execute(text("ALTER TABLE jobposting ADD COLUMN status VARCHAR"))

                if "application_qa" not in existing_cols:
                    if dialect.startswith("postgres"):
                        conn.execute(text("ALTER TABLE jobposting ADD COLUMN IF NOT EXISTS application_qa JSONB DEFAULT '[]'::jsonb"))
                    else:
                        conn.execute(text("ALTER TABLE jobposting ADD COLUMN application_qa TEXT"))
    except Exception:
        # Non-fatal; app can still run, and errors will surface where needed
        pass

