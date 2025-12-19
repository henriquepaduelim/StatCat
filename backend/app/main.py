from pathlib import Path
from datetime import datetime, date, time
import json
import logging

from app.core.config import settings
from alembic.config import Config
from alembic.script import ScriptDirectory
from alembic.runtime.migration import MigrationContext

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError


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
if (
    settings.ENVIRONMENT.lower() not in {"dev", "development", "local"}
    and not settings.FRONTEND_ORIGIN
    and not settings.CORS_ORIGINS
):
    logger.warning(
        "CORS: no production origin set (FRONTEND_ORIGIN or CORS_ORIGINS). "
        "Only localhost origins are allowed."
    )

media_path = Path(settings.MEDIA_ROOT)
media_path.mkdir(parents=True, exist_ok=True)

app.mount("/media", StaticFiles(directory=media_path), name="media")


@app.on_event("startup")
def on_startup() -> None:
    # Evite criar/migrar DB automaticamente em produção; use alembic upgrade no deploy.
    if settings.AUTO_SEED_DATABASE:
        init_db()
    _check_migration_drift()


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


def _check_migration_drift() -> None:
    """Log if the database revision is behind Alembic head."""
    try:
        backend_root = Path(__file__).resolve().parent.parent
        alembic_cfg = Config(str(backend_root / "alembic.ini"))
        alembic_cfg.set_main_option("script_location", str(backend_root / "alembic"))
        alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

        script = ScriptDirectory.from_config(alembic_cfg)
        head_revision = script.get_current_head()

        with engine.connect() as connection:
            context = MigrationContext.configure(connection)
            current_revision = context.get_current_revision()
    except Exception as exc:  # pragma: no cover - observational guard
        logger.warning("Could not check Alembic migration status: %s", exc)
        return

    if current_revision != head_revision:
        env = settings.ENVIRONMENT.lower()
        log_level = logging.ERROR
        if env in {"dev", "development", "local"}:
            log_level = logging.WARNING
        logger.log(
            log_level,
            "Alembic revision mismatch detected (database=%s, head=%s). Run migrations.",
            current_revision,
            head_revision,
        )
