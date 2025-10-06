from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration pulled from environment variables."""

    PROJECT_NAME: str = "Combine Backend"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    DATABASE_URL: str = "sqlite:///./combine.db"
    AWS_S3_BUCKET: str | None = None
    AWS_REGION: str | None = None
    SECRET_KEY: str = "change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    BACKEND_CORS_ORIGINS: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
