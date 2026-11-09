from __future__ import annotations

import logging

import pandas as pd

from app.config import Settings
from app.ingestion.base import SeriesResult, make_frame
from app.ingestion.derived import compute_ma200, compute_rsi
from app.ingestion.fetch import HttpClient
from app.ingestion.yahoo import fetch_chart

logger = logging.getLogger(__name__)

# Daily bars kept per ETF. The section only reports RSI(14) and the 200-day
# average, so a 500-day window covers both with slack while keeping the
# observations table small. The full history is still used to warm up.
SNAPSHOT_WINDOW_DAYS = 500

# One ETF per GICS sector of the S&P 500, plus ITA for the aerospace and
# defense slice. Subsector ETFs that duplicate a listed slice (XAR, PPA,
# IYT, ... ) are deliberately excluded so no two cards cover the same
# exposure.
SECTOR_ETF: list[dict[str, str]] = [
    {"symbol": "XLE", "name": "Energy"},
    {"symbol": "XLB", "name": "Materials"},
    {"symbol": "XLI", "name": "Industrials"},
    {"symbol": "ITA", "name": "Aerospace & Defense"},
    {"symbol": "XLF", "name": "Financials"},
    {"symbol": "XLK", "name": "Technology"},
    {"symbol": "XLC", "name": "Communication Services"},
    {"symbol": "XLY", "name": "Consumer Discretionary"},
    {"symbol": "XLP", "name": "Consumer Staples"},
    {"symbol": "XLV", "name": "Health Care"},
    {"symbol": "XLRE", "name": "Real Estate"},
    {"symbol": "XLU", "name": "Utilities"},
]


def sector_series_id(symbol: str) -> str:
    return f"sector_{symbol.lower()}"


def _observations_for(definition: dict[str, str], frame: pd.DataFrame) -> pd.DataFrame:
    """RSI(14) as the value, 200-day stats in meta, for one sector ETF."""
    working = frame[["date", "close"]].copy().sort_values("date").reset_index(drop=True)
    working["rsi"] = compute_rsi(working["close"])
    metrics = compute_ma200(working["close"])
    working = working.join(metrics)
    working = working.dropna(subset=["rsi", "ma200", "deviation"])
    working = working.tail(SNAPSHOT_WINDOW_DAYS)
    symbol = definition["symbol"]
    label = definition["name"]
    rows = [
        {
            "period_date": row.date,
            "effective_date": row.date,
            "value": float(row.rsi),
            "is_estimate": False,
            "source": f"Yahoo Finance / {symbol} ({label})",
            "meta": {
                "symbol": symbol,
                "name": label,
                "price": float(row.close),
                "ma200": float(row.ma200),
                "dev": float(row.deviation),
            },
        }
        for row in working.itertuples()
    ]
    return make_frame(rows)


def fetch_sector_snapshot_series(
    settings: Settings,
    client: HttpClient,
) -> list[tuple[SeriesResult, pd.DataFrame]]:
    """Fetch and build the observation series for each sector ETF.

    A failure on one ETF is logged and skipped; the other sectors still load.
    """
    outputs: list[tuple[SeriesResult, pd.DataFrame]] = []
    empty = pd.DataFrame(columns=["date", "close", "adjclose"])
    if not settings.allow_unofficial_price_feed:
        message = (
            "Price feed disabled by configuration. Set ALLOW_UNOFFICIAL_PRICE_FEED=true "
            "for personal research or import a licensed price series."
        )
        for definition in SECTOR_ETF:
            outputs.append(
                (
                    SeriesResult(
                        indicator_id=sector_series_id(definition["symbol"]),
                        status="skipped",
                        message=message,
                        source="Yahoo Finance (unofficial)",
                    ),
                    empty,
                )
            )
        return outputs
    for definition in SECTOR_ETF:
        symbol = definition["symbol"]
        series_id = sector_series_id(symbol)
        try:
            frame = fetch_chart(settings, client, symbol)
        except Exception as exc:
            logger.exception("Sector %s ingestion failed", symbol)
            outputs.append(
                (
                    SeriesResult(
                        indicator_id=series_id,
                        status="error",
                        message=str(exc)[:500],
                        source="Yahoo Finance",
                    ),
                    empty,
                )
            )
            continue
        observations = _observations_for(definition, frame)
        if observations.empty:
            outputs.append(
                (
                    SeriesResult(
                        indicator_id=series_id,
                        status="skipped",
                        message=f"{symbol} returned no usable RSI/200-day observations.",
                        source="Yahoo Finance",
                    ),
                    empty,
                )
            )
            continue
        outputs.append(
            (
                SeriesResult(
                    indicator_id=series_id,
                    status="ok",
                    observations=observations,
                    source="Yahoo Finance",
                    message=f"Loaded {len(observations)} sector snapshot observations for {symbol}",
                ),
                frame,
            )
        )
    return outputs
