import logging
from pathlib import Path
from datetime import datetime, date, time
import json

from app.core.config import settings

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
from starlette.requests import Request


def _maybe_verify_gcs() -> None:
    """Optionally verify GCS credentials; skipped unless explicitly enabled."""
    env = settings.ENVIRONMENT.lower()
    provider = settings.STORAGE_PROVIDER.lower()
    if provider != "gcs":
        logging.getLogger(__name__).info(
            "GCS check skipped (STORAGE_PROVIDER=%s)", settings.STORAGE_PROVIDER
        )
        return
    if env in {"dev", "development", "local"}:
        logging.getLogger(__name__).info(
            "Running in local environment, skipping GCS authentication at startup."
        )
        return

    try:
        from google.cloud import storage  # type: ignore
        from google.api_core.exceptions import GoogleAPICallError  # type: ignore
    except ImportError:
        logging.getLogger(__name__).warning(
            "GCS provider selected but 'google-cloud-storage' is not installed; skipping check."
        )
        return

    try:
        logger = logging.getLogger(__name__)
        logger.info("Attempting to authenticate with Google Cloud Storage...")
        storage_client = storage.Client()
        _ = storage_client.list_buckets()
        logger.info("✅ Google Cloud Storage authentication successful.")
    except GoogleAPICallError as exc:
        logger.error(
            "❌ Google Cloud Storage authentication failed. "
            "Check GOOGLE_APPLICATION_CREDENTIALS and permissions.",
            exc_info=True,
        )
        raise exc
    except Exception as exc:  # pragma: no cover - unexpected runtime errors
        logger.error(
            "❌ Unexpected error during GCS authentication.", exc_info=True
        )
        raise exc


from app.api.v1.router import api_router
from app.core.observability import (
    RequestContextMiddleware,
    configure_logging,
    setup_metrics,
    setup_sentry,
    setup_tracing,
)
from app.db.session import engine, init_db

configure_logging(settings.LOG_LEVEL)
setup_sentry(settings)
logger = logging.getLogger(__name__)

# Optional GCS check (disabled unless STORAGE_PROVIDER=gcs)
_maybe_verify_gcs()

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)
app.add_middleware(RequestContextMiddleware)
setup_metrics(app)
setup_tracing(app, settings, engine=engine)


# Global exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error on {request.url}: {exc}")

    def _default(o):
        if isinstance(o, (datetime, date, time)):
            return o.isoformat()
        raise TypeError

    return JSONResponse(
        status_code=422,
        content=json.loads(json.dumps({"detail": exc.errors()}, default=_default)),
    )


# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.resolved_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

media_path = Path(settings.MEDIA_ROOT)
media_path.mkdir(parents=True, exist_ok=True)

app.mount("/media", StaticFiles(directory=media_path), name="media")


@app.on_event("startup")
def on_startup() -> None:
    # Evite criar/migrar DB automaticamente em produção; use alembic upgrade no deploy.
    if settings.AUTO_SEED_DATABASE:
        init_db()


@app.get("/sentry-debug", include_in_schema=False)
async def trigger_sentry_error() -> None:
    """Endpoint to generate a test error for Sentry/observability checks."""
    if settings.ENVIRONMENT.lower() in {"dev", "development", "local"}:
        1 / 0  # noqa: B018 - intentional crash for testing
    raise RuntimeError("sentry-debug endpoint disabled in this environment")


@app.get("/health", tags=["Health"])
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api_router, prefix=settings.API_V1_PREFIX)
