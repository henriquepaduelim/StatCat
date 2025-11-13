from fastapi import APIRouter

from app.api.v1.endpoints import (
    analytics,
    athletes,
    auth,
    dashboard,
    events,
    groups,
    match_stats,
    report_submissions,
    teams,
    # dev,
    reports,
    sessions,
    tests,
)

api_router = APIRouter()
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(athletes.router, prefix="/athletes", tags=["Athletes"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(events.router, prefix="/events", tags=["Events"])
api_router.include_router(groups.router, prefix="/groups", tags=["Groups"])
api_router.include_router(match_stats.router, prefix="/match-stats", tags=["Match Stats"])
api_router.include_router(report_submissions.router, prefix="/report-submissions", tags=["Report Submissions"])
api_router.include_router(teams.router, prefix="/teams", tags=["Teams"])
api_router.include_router(tests.router, prefix="/tests", tags=["Tests"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
# api_router.include_router(dev.router, prefix="/dev", tags=["Dev"])
