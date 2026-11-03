from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

import pandas as pd

from app.config import Settings
from app.ingestion.base import SeriesResult, SourceError, make_frame
from app.ingestion.fetch import HttpClient


def _read_source(source: str, client: HttpClient) -> str:
    parsed = urlparse(source)
    if parsed.scheme in {"http", "https"}:
        return client.get_text(source)
    path = Path(source.removeprefix("file://"))
    if not path.exists():
        raise SourceError(f"CSV source not found: {source}")
    return path.read_text(encoding="utf-8")


def load_csv_feed(
    settings: Settings,
    client: HttpClient,
    indicator_id: str,
    source: str,
    source_label: str,
    earnings_basis: str | None = None,
) -> SeriesResult:
    if not source:
        return SeriesResult(
            indicator_id=indicator_id,
            status="skipped",
            message="No authorized CSV feed is configured.",
            source=source_label,
        )
    try:
        text = _read_source(source, client)
        frame = pd.read_csv(pd.io.common.StringIO(text))
    except Exception as exc:
        raise SourceError(f"could not read {indicator_id} CSV: {exc}") from exc

    required = {"date", "value"}
    if not required.issubset({str(column).strip().lower() for column in frame.columns}):
        raise SourceError(f"{indicator_id} CSV must contain date and value columns")
    frame.columns = [str(column).strip().lower() for column in frame.columns]
    frame["period_date"] = pd.to_datetime(frame["date"], errors="coerce")
    frame["value"] = pd.to_numeric(frame["value"], errors="coerce")
    frame = frame.dropna(subset=["period_date", "value"])

    if indicator_id == "forward_pe":
        frame = frame[frame["value"] > 0]
    if indicator_id == "fear_greed":
        frame = frame[(frame["value"] >= 0) & (frame["value"] <= 100)]
    if frame.empty:
        raise SourceError(f"{indicator_id} CSV contained no valid observations")

    lag = settings.weights.availability_lag(indicator_id)
    if "release_date" in frame.columns:
        frame["effective_date"] = pd.to_datetime(frame["release_date"], errors="coerce")
    else:
        frame["effective_date"] = frame["period_date"]
    frame["effective_date"] = frame["effective_date"].fillna(
        frame["period_date"] + pd.Timedelta(days=lag)
    )
    if "is_estimate" in frame.columns:
        frame["is_estimate"] = frame["is_estimate"].astype(str).str.lower().isin(
            {"true", "1", "yes", "y"}
        )
    else:
        frame["is_estimate"] = False

    basis = earnings_basis
    if indicator_id == "forward_pe" and "earnings_basis" in frame.columns:
        values = frame["earnings_basis"].dropna().astype(str)
        if not values.empty:
            basis = values.iloc[-1]

    rows = []
    for row in frame.itertuples():
        meta = {"earnings_basis": basis} if indicator_id == "forward_pe" else {}
        rows.append(
            {
                "period_date": row.period_date.date(),
                "effective_date": row.effective_date.date(),
                "value": float(row.value),
                "is_estimate": bool(row.is_estimate),
                "source": source_label,
                "meta": meta,
            }
        )
    observations = make_frame(rows)
    return SeriesResult(
        indicator_id=indicator_id,
        status="ok",
        observations=observations,
        source=source_label,
        message=f"Loaded {len(observations)} observations from an authorized CSV feed",
    )
