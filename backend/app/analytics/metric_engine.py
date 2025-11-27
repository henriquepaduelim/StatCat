from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from statistics import mean
from typing import Iterable, Sequence

from sqlalchemy import select
from sqlmodel import Session

from app.analytics.metric_definitions import MetricDefinition, get_metric_by_id
from app.models.athlete import Athlete
from app.models.session_result import SessionResult
from app.models.test_definition import TestDefinition
from app.schemas.analytics import (
    AthleteMetricsResponse,
    MetricComponent,
    MetricRankingResponse,
    MetricScore,
    RankingEntry,
)


def _normalize_name(name: str) -> str:
    return "".join(ch for ch in name.lower() if ch.isalnum())


SPRINT_DISTANCES_METERS = {
    "5msprint": 5.0,
    "10msprint": 10.0,
    "12stepsprint": 12.0,
    "15msprint": 15.0,
    "20msprint": 20.0,
    "25msprint": 25.0,
    "30msprint": 30.0,
    "35msprint": 35.0,
    "40msprint": 40.0,
}


VERTICAL_JUMP_ALIASES = {
    "verticaljumpnorunup": {"vertical jump (no run-up)", "vertical jump", "vertical jump norun"},
    "verticaljumprunup": {"vertical jump (run-up)", "vertical jump run", "vertical jump run-up"},
}


def _age_from_birth_year(athlete: Athlete) -> int | None:
    if not athlete.birth_date:
        return None
    today = date.today()
    age = today.year - athlete.birth_date.year
    if (today.month, today.day) < (athlete.birth_date.month, athlete.birth_date.day):
        age -= 1
    return age


AGE_CATEGORY_BOUNDS = {
    "U12": (0, 12),
    "U13": (13, 13),
    "U14": (14, 14),
    "U15": (15, 15),
    "U16": (16, 16),
    "U19": (17, 19),
}


@dataclass(frozen=True)
class _TestMeta:
    definition: TestDefinition
    normalized: str


class MetricEngine:
    def __init__(self, session: Session) -> None:
        self.session = session
        self._tests = self._load_tests()

    def _load_tests(self) -> dict[str, _TestMeta]:
        statement = select(TestDefinition)
        tests: dict[str, _TestMeta] = {}
        definitions = self.session.exec(statement).scalars().all()
        for definition in definitions:
            normalized = _normalize_name(definition.name)
            tests[normalized] = _TestMeta(definition=definition, normalized=normalized)
        return tests

    def _get_metric_definition(self, metric_id: str) -> MetricDefinition:
        return get_metric_by_id(metric_id)

    def _resolve_tests(self, names: Sequence[str]) -> list[_TestMeta]:
        resolved: list[_TestMeta] = []
        for name in names:
            normalized = _normalize_name(name)
            match = self._tests.get(normalized)
            if match:
                resolved.append(match)
                continue
            # Handle aliases for vertical jump variations.
            aliases = VERTICAL_JUMP_ALIASES.get(normalized)
            if aliases:
                for alias in aliases:
                    alias_meta = self._tests.get(_normalize_name(alias))
                    if alias_meta and alias_meta not in resolved:
                        resolved.append(alias_meta)
                        break
        return resolved

    def _fetch_results(self, athlete_id: int, tests: Sequence[_TestMeta]) -> dict[int, list[float]]:
        if not tests:
            return {}
        test_ids = [test.definition.id for test in tests if test.definition.id is not None]
        if not test_ids:
            return {}

        statement = (
            select(SessionResult.test_id, SessionResult.value)
            .where(SessionResult.athlete_id == athlete_id)
            .where(SessionResult.test_id.in_(test_ids))
        )
        values: dict[int, list[float]] = defaultdict(list)
        for test_id, value in self.session.exec(statement).all():
            if value is None:
                continue
            values[test_id].append(float(value))
        return values

    def _best_value(self, values: Iterable[float], higher_is_better: bool) -> float:
        data = list(values)
        if not data:
            raise ValueError("No data provided")
        return max(data) if higher_is_better else min(data)

    def _compute_short_acceleration(self, athlete: Athlete) -> MetricScore | None:
        metric = self._get_metric_definition("short_acceleration")
        tests = self._resolve_tests(metric.primary_tests)
        results = self._fetch_results(athlete.id, tests)
        if not results:
            return None

        component_scores: list[MetricComponent] = []
        speeds: list[float] = []
        for test in tests:
            test_id = test.definition.id
            if test_id is None or test_id not in results:
                continue
            normalized = test.normalized
            distance = SPRINT_DISTANCES_METERS.get(normalized)
            if not distance:
                continue
            best_time = self._best_value(results[test_id], higher_is_better=False)
            if best_time <= 0:
                continue
            speed = distance / best_time
            speeds.append(speed)
            component_scores.append(
                MetricComponent(label=test.definition.name, value=round(speed, 2), unit="m/s")
            )

        if not speeds:
            return None

        value = round(mean(speeds), 2)
        return MetricScore(
            id=metric.id,
            name=metric.name,
            category=metric.category,
            description=metric.description,
            direction="higher_is_better",
            value=value,
            unit="m/s",
            components=component_scores,
            tags=list(metric.tags or ()),
        )

    def _compute_top_end_speed(self, athlete: Athlete) -> MetricScore | None:
        metric = self._get_metric_definition("top_end_speed")
        tests = self._resolve_tests(metric.primary_tests)
        results = self._fetch_results(athlete.id, tests)
        if not results:
            return None

        component_scores: list[MetricComponent] = []
        top_speed: float | None = None
        for test in tests:
            test_id = test.definition.id
            if test_id is None or test_id not in results:
                continue
            distance = SPRINT_DISTANCES_METERS.get(test.normalized)
            if not distance:
                continue
            best_time = self._best_value(results[test_id], higher_is_better=False)
            if best_time <= 0:
                continue
            speed = distance / best_time
            component_scores.append(
                MetricComponent(label=test.definition.name, value=round(speed, 2), unit="m/s")
            )
            if top_speed is None or speed > top_speed:
                top_speed = speed

        if top_speed is None:
            return None

        return MetricScore(
            id=metric.id,
            name=metric.name,
            category=metric.category,
            description=metric.description,
            direction="higher_is_better",
            value=round(top_speed, 2),
            unit="m/s",
            components=component_scores,
            tags=list(metric.tags or ()),
        )

    def _compute_lower_body_power(self, athlete: Athlete) -> MetricScore | None:
        metric = self._get_metric_definition("lower_body_power")
        tests = self._resolve_tests(metric.primary_tests)
        results = self._fetch_results(athlete.id, tests)
        if not results:
            return None

        converted: list[float] = []
        components: list[MetricComponent] = []
        for test in tests:
            test_id = test.definition.id
            if test_id is None or test_id not in results:
                continue
            raw_best = self._best_value(results[test_id], higher_is_better=True)
            unit = test.definition.unit or ""
            value = raw_best
            if unit.lower() in {"in", "inch", "inches"}:
                value = raw_best * 2.54
                unit_display = "cm"
            else:
                unit_display = unit or "cm"
            converted.append(value)
            components.append(
                MetricComponent(label=test.definition.name, value=round(value, 2), unit=unit_display)
            )

        if not converted:
            return None

        average_power = round(mean(converted), 2)
        return MetricScore(
            id=metric.id,
            name=metric.name,
            category=metric.category,
            description=metric.description,
            direction="higher_is_better",
            value=average_power,
            unit="cm",
            components=components,
            tags=list(metric.tags or ()),
        )

    def _compute_aerobic_capacity(self, athlete: Athlete) -> MetricScore | None:
        metric = self._get_metric_definition("aerobic_capacity")
        tests = self._resolve_tests(metric.primary_tests)
        results = self._fetch_results(athlete.id, tests)
        if not results:
            return None

        test = tests[0]
        test_id = test.definition.id
        if test_id is None or test_id not in results:
            return None
        best_level = self._best_value(results[test_id], higher_is_better=True)
        vo2_estimate = round(3.46 * best_level + 12, 2)

        components = [
            MetricComponent(label=test.definition.name, value=best_level, unit=test.definition.unit or "level")
        ]

        return MetricScore(
            id=metric.id,
            name=metric.name,
            category=metric.category,
            description=metric.description,
            direction="higher_is_better",
            value=vo2_estimate,
            unit="ml·kg⁻¹·min⁻¹",
            components=components,
            tags=list(metric.tags or ()),
        )

    def _compute_metric(self, athlete: Athlete, metric_id: str) -> MetricScore | None:
        if metric_id == "short_acceleration":
            return self._compute_short_acceleration(athlete)
        if metric_id == "top_end_speed":
            return self._compute_top_end_speed(athlete)
        if metric_id == "lower_body_power":
            return self._compute_lower_body_power(athlete)
        if metric_id == "aerobic_capacity":
            return self._compute_aerobic_capacity(athlete)
        return None

    def build_metric_response(
        self,
        athlete: Athlete,
        metric_ids: Sequence[str] | None = None,
    ) -> AthleteMetricsResponse:
        targets = metric_ids or [
            "short_acceleration",
            "top_end_speed",
            "lower_body_power",
            "aerobic_capacity",
        ]
        metrics: list[MetricScore] = []
        for metric_id in targets:
            score = self._compute_metric(athlete, metric_id)
            if score is not None:
                metrics.append(score)
        return AthleteMetricsResponse(athlete_id=athlete.id, metrics=metrics)

    def metric_ranking(
        self,
        metric_id: str,
        athletes: Sequence[Athlete],
        limit: int = 10,
    ) -> MetricRankingResponse:
        definition = self._get_metric_definition(metric_id)
        entries: list[RankingEntry] = []
        for athlete in athletes:
            score = self._compute_metric(athlete, metric_id)
            if score is None or score.value is None:
                continue
            entries.append(
                RankingEntry(
                    athlete_id=athlete.id,
                    full_name=f"{athlete.first_name} {athlete.last_name}",
                    value=score.value,
                    unit=score.unit,
                    team=athlete.club_affiliation,
                    age=_age_from_birth_year(athlete),
                    gender=athlete.gender.value if athlete.gender else None,
                )
            )

        reverse = definition.direction != "lower_is_better"
        entries.sort(key=lambda item: item.value, reverse=reverse)
        entries = entries[:limit]

        representative = MetricScore(
            id=definition.id,
            name=definition.name,
            category=definition.category,
            description=definition.description,
            direction=definition.direction
            if definition.direction in {"higher_is_better", "lower_is_better", "mixed"}
            else "mixed",
            value=None,
            unit=None,
            components=[],
            tags=list(definition.tags or ()),
        )

        return MetricRankingResponse(metric=representative, entries=entries)


def filter_athletes(
    athletes: Sequence[Athlete],
    *,
    age_category: str | None = None,
    gender: str | None = None,
) -> list[Athlete]:
    filtered: list[Athlete] = []
    for athlete in athletes:
        if gender:
            gender_norm = gender.lower()
            target = "male" if gender_norm in {"m", "boy", "boys", "male", "masculino"} else "female"
            if not athlete.gender or athlete.gender.value != target:
                continue
        if age_category and age_category in AGE_CATEGORY_BOUNDS:
            bounds = AGE_CATEGORY_BOUNDS[age_category]
            age = _age_from_birth_year(athlete)
            if age is None:
                continue
            lower, upper = bounds
            if age < lower or age > upper:
                continue
        filtered.append(athlete)
    return filtered
