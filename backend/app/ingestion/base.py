from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import date

import pandas as pd

OBSERVATION_COLUMNS = [
    "period_date",
    "effective_date",
    "value",
    "is_estimate",
    "source",
    "meta",
]


@dataclass
class SeriesResult:
    indicator_id: str
    status: str
    observations: pd.DataFrame = field(default_factory=lambda: pd.DataFrame(columns=OBSERVATION_COLUMNS))
    message: str = ""
    source: str = ""

    @property
    def ok(self) -> bool:
        return self.status == "ok" and not self.observations.empty

    def to_status(self) -> dict:
        return {
            "indicator_id": self.indicator_id,
            "status": self.status,
            "message": self.message,
            "source": self.source,
            "rows": int(len(self.observations)),
            "latest": (
                self.observations["period_date"].max().isoformat()
                if not self.observations.empty
                else None
            ),
        }


class SourceError(RuntimeError):
    pass


def empty_frame() -> pd.DataFrame:
    return pd.DataFrame(columns=OBSERVATION_COLUMNS)


def make_frame(rows: Iterable[dict]) -> pd.DataFrame:
    frame = pd.DataFrame(list(rows))
    if frame.empty:
        return empty_frame()
    for column in OBSERVATION_COLUMNS:
        if column not in frame.columns:
            if column == "meta":
                frame[column] = [{} for _ in range(len(frame))]
            elif column == "is_estimate":
                frame[column] = False
            elif column == "source":
                frame[column] = ""
            else:
                frame[column] = None
    frame["period_date"] = pd.to_datetime(frame["period_date"]).dt.date
    frame["effective_date"] = pd.to_datetime(frame["effective_date"]).dt.date
    frame["value"] = pd.to_numeric(frame["value"], errors="coerce")
    frame = frame.dropna(subset=["period_date", "effective_date", "value"])
    frame["is_estimate"] = frame["is_estimate"].fillna(False).astype(bool)
    frame["source"] = frame["source"].fillna("")
    frame["meta"] = frame["meta"].apply(lambda item: item if isinstance(item, dict) else {})
    frame = frame[frame["value"].map(lambda value: pd.notna(value) and float(value) == float(value))]
    frame = frame.sort_values(["period_date", "effective_date"]).drop_duplicates(
        subset=["period_date"], keep="last"
    )
    return frame.reset_index(drop=True)


def as_date(value) -> date:
    if isinstance(value, date):
        return value
    return pd.Timestamp(value).date()
