from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, func
from sqlmodel import Session, select

from app.analytics.metric_engine import MetricEngine, filter_athletes
from app.api.deps import get_current_active_user
from app.db.session import get_session
from app.models.athlete import Athlete, AthleteStatus
from app.models.match_stat import MatchStat
from app.models.team import Team
from app.models.user import User, UserRole
from app.schemas.analytics import (
    AthleteMetricsResponse,
    LeaderboardEntry,
    LeaderboardResponse,
    MetricRankingResponse,
)

router = APIRouter()

@router.get("/athletes/{athlete_id}/metrics", response_model=AthleteMetricsResponse)
def athlete_metrics(
    athlete_id: int,
    metric_ids: list[str] | None = Query(default=None, alias="metric"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> AthleteMetricsResponse:
    athlete = session.get(Athlete, athlete_id)
    if athlete is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")
    if current_user.role == UserRole.ATHLETE and current_user.athlete_id != athlete.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    engine = MetricEngine(session)
    try:
        return engine.build_metric_response(athlete, metric_ids)
    except KeyError as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

@router.get("/rankings/metrics/{metric_id}", response_model=MetricRankingResponse)
def metric_ranking(
    metric_id: str,
    limit: int = Query(default=10, ge=1, le=50),
    gender: str | None = Query(default=None),
    age_category: str | None = Query(default=None),
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_active_user),
) -> MetricRankingResponse:
    statement = select(Athlete).where(Athlete.status == AthleteStatus.active)
    engine = MetricEngine(session)
    athletes = session.exec(statement).all()
    if not athletes:
        try:
            return engine.metric_ranking(metric_id, [], limit=limit)
        except KeyError as exc:  # pragma: no cover - defensive
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    filtered_athletes = filter_athletes(athletes, age_category=age_category, gender=gender)
    if not filtered_athletes:
        try:
            return engine.metric_ranking(metric_id, [], limit=limit)
        except KeyError as exc:  # pragma: no cover - defensive
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    try:
        return engine.metric_ranking(metric_id, filtered_athletes, limit=limit)
    except KeyError as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/leaderboards/scoring", response_model=LeaderboardResponse)
def scoring_leaderboard(
    leaderboard_type: Literal["scorers", "clean_sheets"] = Query(default="scorers"),
    limit: int = Query(default=10, ge=1, le=50),
    gender: str | None = Query(default=None),
    age_category: str | None = Query(default=None),
    team_id: int | None = Query(default=None),
    session: Session = Depends(get_session),
    _current_user: User = Depends(get_current_active_user),
) -> LeaderboardResponse:
    if leaderboard_type == "clean_sheets":
        clean_sheet_case = case((MatchStat.goals_conceded == 0, 1), else_=0)
        statement = (
            select(
                Athlete.id,
                Athlete.first_name,
                Athlete.last_name,
                Athlete.primary_position,
                Team.name,
                Team.age_category,
                func.count(MatchStat.id).label("games_played"),
                func.sum(clean_sheet_case).label("clean_sheets"),
                func.sum(MatchStat.goals_conceded).label("goals_conceded"),
            )
            .join(MatchStat, MatchStat.athlete_id == Athlete.id)
            .outerjoin(Team, Team.id == MatchStat.team_id)
            .where(Athlete.status == AthleteStatus.active)
            .where(MatchStat.goals == 0, MatchStat.shootout_goals == 0)
        )

        if gender:
            statement = statement.where(Athlete.gender == gender.lower())
        if age_category:
            statement = statement.where(Team.age_category == age_category)
        if team_id is not None:
            statement = statement.where(MatchStat.team_id == team_id)

        grouped = statement.group_by(
            Athlete.id,
            Athlete.first_name,
            Athlete.last_name,
            Athlete.primary_position,
            Team.name,
            Team.age_category,
        )

        rows = session.exec(grouped).all()
        entries: list[LeaderboardEntry] = []

        for row in rows:
            (
                athlete_id,
                first_name,
                last_name,
                primary_position,
                team_name,
                team_age_category,
                games_played,
                clean_sheets,
                goals_conceded,
            ) = row

            games_played = int(games_played or 0)
            if games_played <= 0:
                continue

            clean_sheets = int(clean_sheets or 0)
            goals_conceded = int(goals_conceded or 0)

            entries.append(
                LeaderboardEntry(
                    athlete_id=athlete_id,
                    full_name=f"{first_name} {last_name}",
                    team=team_name,
                    age_category=team_age_category,
                    position=primary_position,
                    goals=0,
                    clean_sheets=clean_sheets,
                    games_played=games_played,
                    goals_conceded=goals_conceded,
                )
            )

        entries.sort(
            key=lambda entry: (
                -entry.clean_sheets,
                entry.goals_conceded / entry.games_played if entry.games_played else float("inf"),
            ),
        )
    else:
        statement = (
            select(
                Athlete.id,
                Athlete.first_name,
                Athlete.last_name,
                Athlete.primary_position,
                Team.name,
                Team.age_category,
                func.sum(MatchStat.goals).label("goals"),
            )
            .join(MatchStat, MatchStat.athlete_id == Athlete.id)
            .outerjoin(Team, Team.id == MatchStat.team_id)
            .where(Athlete.status == AthleteStatus.active)
        )

        if gender:
            statement = statement.where(Athlete.gender == gender.lower())
        if age_category:
            statement = statement.where(Team.age_category == age_category)
        if team_id is not None:
            statement = statement.where(MatchStat.team_id == team_id)

        grouped = statement.group_by(
            Athlete.id,
            Athlete.first_name,
            Athlete.last_name,
            Athlete.primary_position,
            Team.name,
            Team.age_category,
        )

        rows = session.exec(grouped).all()
        entries = []

        for row in rows:
            (
                athlete_id,
                first_name,
                last_name,
                primary_position,
                team_name,
                team_age_category,
                goals,
            ) = row

            goals = int(goals or 0)
            if goals <= 0:
                continue

            entries.append(
                LeaderboardEntry(
                    athlete_id=athlete_id,
                    full_name=f"{first_name} {last_name}",
                    team=team_name,
                    age_category=team_age_category,
                    position=primary_position,
                    goals=goals,
                    clean_sheets=0,
                )
            )

        entries.sort(key=lambda entry: entry.goals, reverse=True)

    if len(entries) > limit:
        entries = entries[:limit]

    return LeaderboardResponse(leaderboard_type=leaderboard_type, entries=entries)
