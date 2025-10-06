from fastapi import APIRouter

from app.api.v1.endpoints import athletes

api_router = APIRouter()
api_router.include_router(athletes.router, prefix="/athletes", tags=["Athletes"])
