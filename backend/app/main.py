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

# Helper function to check if origin is allowed (supports wildcards)
def is_origin_allowed(origin: str) -> bool:
    """Check if origin is allowed, supporting wildcard patterns"""
    if not origin:
        return False
    
    # Check exact matches
    if origin in settings.BACKEND_CORS_ORIGINS:
        return True
    
    # Check wildcard patterns
    import re
    for allowed_origin in settings.BACKEND_CORS_ORIGINS:
        if "*" in allowed_origin:
            # Convert wildcard pattern to regex
            pattern = allowed_origin.replace(".", r"\.").replace("*", ".*")
            if re.match(f"^{pattern}$", origin):
                return True
    
    # In development, allow all
    if settings.ENVIRONMENT == "development":
        return True
    
    return False

# Helper function to get CORS headers
def get_cors_headers(request: Request) -> dict:
    origin = request.headers.get("origin", "")
    # Check if origin is in allowed origins
    if is_origin_allowed(origin):
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
        }
    return {}

# Custom CORS middleware to ensure all responses have CORS headers
class CustomCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")
        
        # Handle OPTIONS requests (preflight)
        if request.method == "OPTIONS":
            if is_origin_allowed(origin):
                return Response(
                    content="",
                    headers={
                        "Access-Control-Allow-Origin": origin,
                        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                        "Access-Control-Allow-Headers": "*",
                        "Access-Control-Allow-Credentials": "true",
                        "Access-Control-Max-Age": "3600",
                    }
                )
        
        # Process the request
        response = await call_next(request)
        
        # Add CORS headers to all responses
        if is_origin_allowed(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "*"
        
        return response

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers=get_cors_headers(request)
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=get_cors_headers(request)
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error on {request.url}: {exc}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
        headers=get_cors_headers(request)
    )

# Add custom CORS middleware first (before CORSMiddleware)
app.add_middleware(CustomCORSMiddleware)

# Configurar CORS com origens específicas
# Adicionar tanto as origens específicas quanto * para desenvolvimento
origins = list(settings.BACKEND_CORS_ORIGINS)
# Em desenvolvimento, adicionar * como fallback
if settings.ENVIRONMENT == "development":
    origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Origens permitidas
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight por 1 hora
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


# Handler para preflight CORS - deve retornar os cabeçalhos CORS
@app.options("/{full_path:path}")
async def options_handler(request: Request):
    """Handle CORS preflight requests"""
    origin = request.headers.get("origin", "")
    
    # Check if origin is allowed
    if origin in settings.BACKEND_CORS_ORIGINS or settings.ENVIRONMENT == "development":
        return JSONResponse(
            content={"status": "ok"},
            headers={
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Max-Age": "3600",
            }
        )
    
    return JSONResponse(content={"status": "ok"})


app.include_router(api_router, prefix=settings.API_V1_PREFIX)
