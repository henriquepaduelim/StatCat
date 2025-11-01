from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import init_db

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

# Configurar CORS PRIMEIRO
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir todas as origens temporariamente
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
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


# Handler para preflight CORS
@app.options("/{full_path:path}")
def options_handler():
    return {"status": "ok"}


app.include_router(api_router, prefix=settings.API_V1_PREFIX)
