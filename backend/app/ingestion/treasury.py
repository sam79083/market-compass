from __future__ import annotations

import logging
from datetime import date
from io import StringIO

import pandas as pd

from app.config import Settings
from app.ingestion.base import SeriesResult, SourceError, make_frame
from app.ingestion.fetch import HttpClient

logger = logging.getLogger(__name__)


def _year_url(settings: Settings, year: int) -> str:
    return (
        f"{settings.treasury_base_url}/{year}/all"
        f"?type=daily_treasury_yield_curve&field_tdr_date_value={year}&page&_format=csv"
    )


def fetch_treasury_10y(settings: Settings, client: HttpClient) -> SeriesResult:
    frames: list[pd.DataFrame] = []
    errors: list[str] = []
    current_year = date.today().year
    for year in range(1990, current_year + 1):
        try:
            text = client.get_text(_year_url(settings, year))
            frame = pd.read_csv(StringIO(text))
            if "Date" not in frame.columns:
                raise ValueError("missing Date column")
            yield_column = next(
                (column for column in frame.columns if str(column).strip().lower() == "10 yr"),
                None,
            )
            if yield_column is None:
                raise ValueError("missing 10 Yr column")
            frame["period_date"] = pd.to_datetime(frame["Date"], format="%m/%d/%Y", errors="coerce")
            frame["value"] = pd.to_numeric(frame[yield_column], errors="coerce")
            frame = frame.dropna(subset=["period_date", "value"])[["period_date", "value"]]
            frames.append(frame)
        except Exception as exc:
            errors.append(f"{year}: {exc}")
            logger.warning("Treasury year %s failed: %s", year, exc)

    if not frames:
        raise SourceError(f"could not load Treasury yields: {'; '.join(errors[:3])}")

    combined = pd.concat(frames, ignore_index=True).drop_duplicates(subset=["period_date"])
    combined = combined.sort_values("period_date")
    rows = [
        {
            "period_date": row.period_date.date(),
            "effective_date": row.period_date.date(),
            "value": float(row.value),
            "is_estimate": False,
            "source": "U.S. Department of the Treasury",
            "meta": {},
        }
        for row in combined.itertuples()
    ]
    observations = make_frame(rows)
    message = f"Loaded {len(observations)} 10-year Treasury observations"
    if errors:
        message += f" with {len(errors)} year(s) failed"
    return SeriesResult(
        indicator_id="treasury_10y",
        status="ok",
        observations=observations,
        source="U.S. Department of the Treasury",
        message=message,
    )
