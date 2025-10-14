from pydantic import BaseModel


class AthleteStatusBreakdown(BaseModel):
    total: int
    active: int
    inactive: int


class DashboardSummary(BaseModel):
    athletes: AthleteStatusBreakdown

