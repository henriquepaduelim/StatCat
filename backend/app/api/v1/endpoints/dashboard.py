from fastapi import APIRouter, Depends
from sqlmodel import Session, func, select

from app.api.deps import get_current_active_user
from app.db.session import get_session
from app.models.athlete import Athlete, AthleteStatus
from app.models.user import User
from app.schemas.dashboard import DashboardSummary

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_active_user),
) -> DashboardSummary:
    statement = select(Athlete.status, func.count(Athlete.id)).group_by(Athlete.status)

    results = session.exec(statement).all()

    counts = {
        (status.value if isinstance(status, AthleteStatus) else status): total
        for status, total in results
    }
    active = counts.get(AthleteStatus.active.value, 0)
    inactive = counts.get(AthleteStatus.inactive.value, 0)
    total = active + inactive

    return DashboardSummary(
        athletes={
            "total": total,
            "active": active,
            "inactive": inactive,
        }
    )
