from fastapi import APIRouter

from app.api.v1.endpoints import athletes, clients, reports, sessions, tests

api_router = APIRouter()
api_router.include_router(athletes.router, prefix="/athletes", tags=["Athletes"])
api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])
api_router.include_router(tests.router, prefix="/tests", tags=["Tests"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
