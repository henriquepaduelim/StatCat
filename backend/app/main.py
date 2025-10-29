from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import init_db

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

media_path = Path(settings.MEDIA_ROOT)
media_path.mkdir(parents=True, exist_ok=True)

app.mount("/media", StaticFiles(directory=media_path), name="media")

# Custom CORS Middleware to ensure Access-Control-Allow-Origin is always set
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    response = await call_next(request)
    origin = request.headers.get("origin")
    if origin and origin in settings.BACKEND_CORS_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    elif "http://localhost:5173" in settings.BACKEND_CORS_ORIGINS and origin == "http://localhost:5173":
        response.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return response


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health", tags=["Health"])
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api_router, prefix=settings.API_V1_PREFIX)
