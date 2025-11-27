"""Custom SQLAlchemy types that tolerate non-string SQLite returns."""

from datetime import date, time
from typing import Any

import sqlalchemy as sa
from sqlalchemy.types import TypeDecorator


class SafeDate(TypeDecorator[date | None]):
    """Date type that accepts str or date from SQLite without raising."""

    impl = sa.Date
    cache_ok = True

    def process_result_value(self, value: Any, dialect: sa.Dialect) -> date | None:
        if value is None:
            return None
        if isinstance(value, date):
            return value
        try:
            return date.fromisoformat(str(value))
        except Exception:
            return None


class SafeTime(TypeDecorator[time | None]):
    """Time type that accepts str or time from SQLite without raising."""

    impl = sa.Time
    cache_ok = True

    def process_result_value(self, value: Any, dialect: sa.Dialect) -> time | None:
        if value is None:
            return None
        if isinstance(value, time):
            return value
        try:
            return time.fromisoformat(str(value))
        except Exception:
            return None
