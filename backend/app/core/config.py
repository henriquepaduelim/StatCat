from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration pulled from environment variables."""

    model_config = SettingsConfigDict(
        # Load base `.env` first, allow `.env.local` to override for local dev
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",  # ignore unrelated env vars (e.g., frontend VITE_* values)
    )

    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "Combine Backend"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    FRONTEND_URL: str | None = "http://localhost:5173"
    DATABASE_URL: str = "sqlite:///./data/combine.db"
    DATABASE_FORCE_IPV4: bool = False
    DATABASE_HOSTADDR: str | None = None
    AWS_S3_BUCKET: str | None = None
    AWS_REGION: str | None = None
    STORAGE_PROVIDER: str = "local"  # options: local, gcs
    SECRET_KEY: str = "change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    SECURITY_ALGORITHM: str = "HS256"
    BACKEND_CORS_ORIGINS: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost:4173",  # Vite preview
        ]
    )
    CORS_ORIGINS: str | None = None  # comma-separated list for production
    FRONTEND_ORIGIN: str | None = None
    ADMIN_EMAIL: str | None = None
    ADMIN_PASSWORD: str | None = None
    ADMIN_NAME: str | None = None
    MEDIA_ROOT: str = "media"
    AUTO_SEED_DATABASE: bool = False
    LOG_LEVEL: str = "INFO"

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
    SMTP_FROM_NAME: str | None = "StatCat - No Reply"
    RESEND_API_KEY: str | None = None
    RESEND_FROM_EMAIL: str | None = None
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30
    PASSWORD_RESET_TOKEN_SALT: str = "password-reset"
    ENCRYPTION_KEY_CURRENT: str | None = None
    ENCRYPTION_KEY_PREVIOUS: str | None = None
    ATHLETE_PHOTO_MAX_BYTES: int = 5 * 1024 * 1024
    ATHLETE_DOCUMENT_MAX_BYTES: int = 10 * 1024 * 1024
    ATHLETE_ALLOWED_DOCUMENT_EXTENSIONS: set[str] = {".pdf", ".png", ".jpg", ".jpeg"}
    ATHLETE_ALLOWED_DOCUMENT_MIME_TYPES: set[str] = {
        "application/pdf",
        "image/png",
        "image/jpeg",
    }
    ATHLETE_ALLOWED_PHOTO_EXTENSIONS: set[str] = {".png", ".jpg", ".jpeg"}
    ATHLETE_ALLOWED_PHOTO_MIME_TYPES: set[str] = {
        "image/png",
        "image/jpeg",
        "image/heic",
        "image/heif",
    }
    USER_PHOTO_MAX_BYTES: int = 5 * 1024 * 1024
    USER_ALLOWED_PHOTO_EXTENSIONS: set[str] = {".png", ".jpg", ".jpeg"}
    USER_ALLOWED_PHOTO_MIME_TYPES: set[str] = {
        "image/png",
        "image/jpeg",
        "image/heic",
        "image/heif",
    }

    # Observability
    SENTRY_DSN: str | None = None
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1
    SENTRY_PROFILES_SAMPLE_RATE: float | None = None
    OTEL_EXPORTER_OTLP_ENDPOINT: str | None = None
    OTEL_EXPORTER_OTLP_HEADERS: str | None = None
    OTEL_SERVICE_NAME: str | None = None
    OTEL_TRACES_SAMPLER_RATIO: float = 0.2

    @model_validator(mode="after")
    def _validate_security_basics(self) -> "Settings":
        """Prevent weak defaults from being used in production-like environments."""

        is_default_secret = self.SECRET_KEY in {
            "change-me",
            "your-secret-key-here",
            "your-secret-key-here-change-in-production",
        }
        is_prod_env = self.ENVIRONMENT.lower() not in {"dev", "development", "local"}

        if is_prod_env and is_default_secret:
            raise ValueError("SECRET_KEY must be set to a strong value in production.")
        if is_prod_env and not self.ENCRYPTION_KEY_CURRENT:
            raise ValueError(
                "ENCRYPTION_KEY_CURRENT must be set in production and cannot fallback to SECRET_KEY."
            )
        if (
            is_prod_env
            and self.ENCRYPTION_KEY_CURRENT
            and self.ENCRYPTION_KEY_CURRENT == self.SECRET_KEY
        ):
            raise ValueError(
                "ENCRYPTION_KEY_CURRENT must differ from SECRET_KEY in production."
            )
        if is_prod_env and self.AUTO_SEED_DATABASE:
            raise ValueError("AUTO_SEED_DATABASE must be disabled in production.")
            return self

    @property
    def resolved_cors_origins(self) -> list[str]:
        """Return CORS origins including optional production origin."""
        origins = list(self.BACKEND_CORS_ORIGINS)
        if self.CORS_ORIGINS:
            extra = [
                item.rstrip("/")
                for item in (value.strip() for value in self.CORS_ORIGINS.split(","))
                if item
            ]
            origins.extend(extra)
        if self.FRONTEND_ORIGIN:
            origins.append(self.FRONTEND_ORIGIN.rstrip("/"))
        # Remove duplicates while preserving order
        seen: set[str] = set()
        deduped: list[str] = []
        for origin in origins:
            if origin and origin not in seen:
                seen.add(origin)
                deduped.append(origin)
        return deduped


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
