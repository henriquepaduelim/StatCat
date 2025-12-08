from __future__ import annotations

import logging
import logging.config
import time
import uuid
from typing import Any

from fastapi import FastAPI, Request
from pythonjsonlogger import jsonlogger
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from prometheus_fastapi_instrumentator import Instrumentator

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.trace.sampling import ParentBased, TraceIdRatioBased

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

from app.core.config import Settings


class _ContextFilter(logging.Filter):
    """Ensure optional context keys exist on every log record."""

    def filter(self, record: logging.LogRecord) -> bool:  # pragma: no cover - trivial
        record.request_id = getattr(record, "request_id", None)
        record.trace_id = getattr(record, "trace_id", None)
        return True


def configure_logging(level: str = "INFO") -> None:
    """Configure JSON logging with safe defaults."""

    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "json": {
                    "()": jsonlogger.JsonFormatter,
                    "fmt": "%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s %(trace_id)s",
                    "rename_fields": {"asctime": "timestamp", "levelname": "level"},
                },
            },
            "filters": {
                "context": {"()": _ContextFilter},
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "json",
                    "filters": ["context"],
                },
            },
            "root": {"level": level.upper(), "handlers": ["console"]},
            "loggers": {
                "uvicorn": {"handlers": ["console"], "level": level.upper(), "propagate": False},
                "uvicorn.error": {"handlers": ["console"], "level": level.upper(), "propagate": False},
                "uvicorn.access": {"handlers": ["console"], "level": level.upper(), "propagate": False},
            },
        }
    )


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Attach request id, trace id, and emit access log."""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        start = time.perf_counter()
        trace_id: str | None = None

        try:
            response = await call_next(request)
        except Exception:
            # Log failure and re-raise
            duration_ms = round((time.perf_counter() - start) * 1000, 3)
            logger = logging.getLogger("app.access")
            logger.exception(
                "request_failed",
                extra={
                    "request_id": request_id,
                    "trace_id": trace_id,
                    "path": request.url.path,
                    "method": request.method,
                    "duration_ms": duration_ms,
                },
            )
            raise

        span = trace.get_current_span()
        span_context = span.get_span_context()
        if span_context and span_context.is_valid:
            trace_id = format(span_context.trace_id, "032x")

        duration_ms = round((time.perf_counter() - start) * 1000, 3)
        response.headers["X-Request-ID"] = request_id

        logger = logging.getLogger("app.access")
        logger.info(
            "request_completed",
            extra={
                "request_id": request_id,
                "trace_id": trace_id,
                "path": request.url.path,
                "method": request.method,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "client_ip": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent"),
            },
        )
        return response


def setup_metrics(app: FastAPI) -> None:
    """Expose Prometheus metrics at /metrics."""

    Instrumentator(
        should_group_status_codes=True,
        should_ignore_untemplated=True,
        excluded_handlers={"/health", "/metrics"},
    ).instrument(app).expose(app, include_in_schema=False)


def _parse_headers(header_str: str | None) -> dict[str, str]:
    if not header_str:
        return {}
    headers: dict[str, str] = {}
    for part in header_str.split(","):
        if not part.strip() or "=" not in part:
            continue
        key, value = part.split("=", 1)
        headers[key.strip()] = value.strip()
    return headers


def setup_tracing(app: FastAPI, settings: Settings, *, engine: Any) -> None:
    """Configure OpenTelemetry exporters and instrument FastAPI + SQLAlchemy + httpx."""

    if not settings.OTEL_EXPORTER_OTLP_ENDPOINT:
        return

    resource = Resource.create(
        {
            "service.name": settings.OTEL_SERVICE_NAME or settings.PROJECT_NAME,
            "service.version": settings.VERSION,
            "deployment.environment": settings.ENVIRONMENT,
        }
    )

    sampler = ParentBased(TraceIdRatioBased(settings.OTEL_TRACES_SAMPLER_RATIO))
    tracer_provider = TracerProvider(resource=resource, sampler=sampler)
    otlp_exporter = OTLPSpanExporter(
        endpoint=settings.OTEL_EXPORTER_OTLP_ENDPOINT,
        headers=_parse_headers(settings.OTEL_EXPORTER_OTLP_HEADERS),
    )
    tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
    trace.set_tracer_provider(tracer_provider)

    FastAPIInstrumentor.instrument_app(app, tracer_provider=tracer_provider)
    SQLAlchemyInstrumentor().instrument(engine=engine, tracer_provider=tracer_provider)
    HTTPXClientInstrumentor().instrument(tracer_provider=tracer_provider)


def setup_sentry(settings: Settings) -> None:
    """Initialize Sentry if DSN provided."""

    if not settings.SENTRY_DSN:
        return

    sentry_logging = LoggingIntegration(level=logging.INFO, event_level=logging.ERROR)
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[FastApiIntegration(), sentry_logging],
        environment=settings.ENVIRONMENT,
        release=settings.VERSION,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        profiles_sample_rate=settings.SENTRY_PROFILES_SAMPLE_RATE,
        send_default_pii=False,
    )
