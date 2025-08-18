from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "AI Interview Coach"
    env: str = "dev"

    pg_host: str | None = None
    pg_port: int | None = None
    pg_user: str | None = None
    pg_password: str | None = None
    pg_db: str | None = None

    openai_api_key: str | None = None
    llm_model: str = "gpt-5-nano"

    jwt_secret: str = "dev-secret"
    jwt_expires_minutes: int = 60

    embedding_provider: str = "auto"  # auto | openai | sentence-transformers
    embedding_model: str | None = None  # if None, choose sensible default per provider
    embedding_dim: int = 1536  # OpenAI text-embedding-3-small

    allow_url_fetch: bool = True
    max_follow_ups: int = 3
    frontend_origin: str | None = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        env_prefix = ""
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()

