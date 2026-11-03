from __future__ import annotations

from io import StringIO

import pandas as pd

from app.config import Settings
from app.ingestion.base import SeriesResult, SourceError, make_frame
from app.ingestion.fetch import HttpClient


def fetch_vix(settings: Settings, client: HttpClient) -> SeriesResult:
    try:
        text = client.get_text(settings.cboe_vix_url)
        frame = pd.read_csv(StringIO(text))
    except Exception as exc:
        raise SourceError(f"could not load Cboe VIX history: {exc}") from exc

    required = {"DATE", "CLOSE"}
    if not required.issubset(frame.columns):
        raise SourceError(f"Cboe VIX file missing columns: {sorted(required - set(frame.columns))}")

    frame["period_date"] = pd.to_datetime(frame["DATE"], format="%m/%d/%Y", errors="coerce")
    frame["value"] = pd.to_numeric(frame["CLOSE"], errors="coerce")
    frame = frame.dropna(subset=["period_date", "value"])
    frame = frame[frame["period_date"] >= pd.Timestamp("1990-01-01")]
    rows = [
        {
            "period_date": row.period_date.date(),
            "effective_date": row.period_date.date(),
            "value": float(row.value),
            "is_estimate": False,
            "source": "Cboe Global Markets",
            "meta": {},
        }
        for row in frame.itertuples()
    ]
    observations = make_frame(rows)
    if observations.empty:
        raise SourceError("Cboe VIX history returned no observations")
    return SeriesResult(
        indicator_id="vix",
        status="ok",
        observations=observations,
        source="Cboe Global Markets",
        message=f"Loaded {len(observations)} VIX observations",
    )
