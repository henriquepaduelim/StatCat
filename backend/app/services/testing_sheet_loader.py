from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class TestingSheetEntry:
    sheet_index: int
    name: str
    category: str
    age_groups: tuple[str, ...]
    benchmark: str | None
    notes: str | None

    @property
    def slug(self) -> str:
        return (
            self.name.lower()
            .replace("(", "")
            .replace(")", "")
            .replace(",", "")
            .replace("/", "-")
            .replace("  ", " ")
            .replace(" ", "-")
        )


def _default_sheet_path() -> Path:
    return Path(__file__).resolve().parents[2] / "source" / "testing_sheet_u19.json"


@lru_cache(maxsize=1)
def load_testing_sheet(path: Path | None = None) -> tuple[TestingSheetEntry, ...]:
    sheet_path = path or _default_sheet_path()
    with sheet_path.open("r", encoding="utf-8") as stream:
        payload: Iterable[dict[str, object]] = json.load(stream)
    entries: list[TestingSheetEntry] = []
    for item in payload:
        entries.append(
            TestingSheetEntry(
                sheet_index=int(item["sheet_index"]),
                name=str(item["name"]),
                category=str(item["category"]),
                age_groups=tuple(item.get("age_groups", ()) or ()),
                benchmark=(
                    str(item["benchmark"])
                    if item.get("benchmark") is not None
                    else None
                ),
                notes=(str(item["notes"]) if item.get("notes") is not None else None),
            )
        )
    return tuple(sorted(entries, key=lambda entry: entry.sheet_index))


def infer_target_direction(name: str) -> str:
    """Best-effort heuristic to mark whether a lower or higher value is desirable."""
    lowered = name.lower()
    if "max time" in lowered:
        return "higher"
    if (
        "resting heart rate" in lowered
        or "recovery" in lowered
        or "body mass" in lowered
        or "body weight" in lowered
    ):
        return "lower"
    if any(
        keyword in lowered
        for keyword in ("sprint", "slalom", "drill", "delivery", "response", "reaction")
    ):
        return "lower"
    if "time" in lowered and "max" not in lowered:
        return "lower"
    return "higher"
