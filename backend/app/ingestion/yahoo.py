from __future__ import annotations

import time
from datetime import UTC, datetime
from urllib.parse import quote

import pandas as pd

from app.config import Settings
from app.ingestion.base import SeriesResult, SourceError, make_frame
from app.ingestion.fetch import HttpClient


def fetch_chart(settings: Settings, client: HttpClient, symbol: str) -> pd.DataFrame:
    encoded = quote(symbol, safe="")
    url = f"{settings.yahoo_chart_url}/{encoded}"
    payload = client.get_json(
        url,
        params={
            "period1": 0,
            "period2": int(time.time()),
            "interval": "1d",
            "includeAdjustedClose": "true",
        },
    )
    chart = payload.get("chart") if isinstance(payload, dict) else None
    if not chart or chart.get("error") or not chart.get("result"):
        error = chart.get("error") if chart else None
        raise SourceError(f"Yahoo chart returned no result for {symbol}: {error}")
    result = chart["result"][0]
    timestamps = result.get("timestamp") or []
    indicators = result.get("indicators") or {}
    quotes = (indicators.get("quote") or [{}])[0]
    closes = quotes.get("close") or []
    adj_series = (indicators.get("adjclose") or [{}])[0]
    adjusted = adj_series.get("adjclose") or []

    rows = []
    for index, timestamp in enumerate(timestamps):
        close = closes[index] if index < len(closes) else None
        if close is None:
            continue
        adj = adjusted[index] if index < len(adjusted) else close
        rows.append(
            {
                "date": datetime.fromtimestamp(timestamp, tz=UTC).date(),
                "close": float(close),
                "adjclose": float(adj) if adj is not None else float(close),
            }
        )
    frame = pd.DataFrame(rows).drop_duplicates(subset=["date"]).sort_values("date")
    if frame.empty:
        raise SourceError(f"Yahoo chart returned no usable closes for {symbol}")
    return frame.reset_index(drop=True)


def fetch_yahoo_series(
    settings: Settings,
    client: HttpClient,
    symbol: str,
    indicator_id: str,
    use_adjusted: bool,
    source_label: str,
) -> tuple[SeriesResult, pd.DataFrame]:
    if not settings.allow_unofficial_price_feed:
        empty = pd.DataFrame(columns=["date", "close", "adjclose"])
        return (
            SeriesResult(
                indicator_id=indicator_id,
                status="skipped",
                message=(
                    "Price feed disabled by configuration. Set ALLOW_UNOFFICIAL_PRICE_FEED=true "
                    "for personal research or import a licensed price series."
                ),
                source="Yahoo Finance (unofficial)",
            ),
            empty,
        )
    frame = fetch_chart(settings, client, symbol)
    value_column = "adjclose" if use_adjusted else "close"
    rows = [
        {
            "period_date": row.date,
            "effective_date": row.date,
            "value": float(getattr(row, value_column)),
            "is_estimate": False,
            "source": source_label,
            "meta": {"close": float(row.close), "adjclose": float(row.adjclose), "symbol": symbol},
        }
        for row in frame.itertuples()
    ]
    observations = make_frame(rows)
    return (
        SeriesResult(
            indicator_id=indicator_id,
            status="ok",
            observations=observations,
            source=source_label,
            message=f"Loaded {len(observations)} daily observations for {symbol}",
        ),
        frame,
    )
