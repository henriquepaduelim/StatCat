from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse # Added this import

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import init_db

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

print(f"CORS Origins: {settings.BACKEND_CORS_ORIGINS}") # DEBUG LINE

media_path = Path(settings.MEDIA_ROOT)
media_path.mkdir(parents=True, exist_ok=True)

app.mount("/media", StaticFiles(directory=media_path), name="media")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# TEMPORARY CORS TEST ENDPOINT
@app.get("/test-cors")
def test_cors():
    response = JSONResponse({"message": "CORS test successful!"})
    response.headers["Access-Control-Allow-Origin"] = "https://statcat-deploy-m6iw7vh77-henriquepaduelims-projects.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health", tags=["Health"])
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api_router, prefix=settings.API_V1_PREFIX)
