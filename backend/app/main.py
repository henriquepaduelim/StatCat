from pathlib import Path
import logging

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi import HTTPException
from fastapi.exceptions import RequestValidationError
from starlette.requests import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import init_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

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
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

media_path = Path(settings.MEDIA_ROOT)
media_path.mkdir(parents=True, exist_ok=True)

app.mount("/media", StaticFiles(directory=media_path), name="media")


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health", tags=["Health"])
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api_router, prefix=settings.API_V1_PREFIX)
