from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration pulled from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "Combine Backend"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    DATABASE_URL: str = "sqlite:///./data/combine.db"
    DATABASE_FORCE_IPV4: bool = False
    DATABASE_HOSTADDR: str | None = None
    AWS_S3_BUCKET: str | None = None
    AWS_REGION: str | None = None
    SECRET_KEY: str = "change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    SECURITY_ALGORITHM: str = "HS256"
    BACKEND_CORS_ORIGINS: list[str] = Field(default_factory=lambda: [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:4173",  # Vite preview
        "https://stat-cat-git-main-henriquepaduelims-projects.vercel.app",
        "https://stats-cat.vercel.app",
        "https://statscat.vercel.app",
        "https://stat-cat.vercel.app",
        # Add Vercel preview URLs variations
        "https://stat-cat-git-*.vercel.app",
        "https://stats-cat-git-*.vercel.app",
    ])
    MEDIA_ROOT: str = "media"
    AUTO_SEED_DATABASE: bool = False
    
    # Google OAuth settings
    GOOGLE_CLIENT_ID: str | None = None
    GOOGLE_CLIENT_SECRET: str | None = None
    GOOGLE_REDIRECT_URI: str | None = None
    
    # SMTP Email Configuration
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM_EMAIL: str | None = None
    SMTP_FROM_NAME: str | None = "Combine Platform"
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30

    @model_validator(mode="after")
    def _validate_security_basics(self) -> "Settings":
        """Prevent weak defaults from being used in production-like environments."""

        is_default_secret = self.SECRET_KEY in {"change-me", "your-secret-key-here", "your-secret-key-here-change-in-production"}
        is_prod_env = self.ENVIRONMENT.lower() not in {"dev", "development", "local"}

        if is_prod_env and is_default_secret:
            raise ValueError("SECRET_KEY must be set to a strong value in production.")
        if is_prod_env and self.AUTO_SEED_DATABASE:
            raise ValueError("AUTO_SEED_DATABASE must be disabled in production.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
