from __future__ import annotations

import logging
import warnings
from datetime import date
from io import StringIO
from pathlib import Path

import pandas as pd

from app.config import BACKEND_ROOT, Settings
from app.ingestion.base import SeriesResult, SourceError, make_frame
from app.ingestion.fetch import HttpClient

logger = logging.getLogger(__name__)

NASDAQ100_SEED_PATH = BACKEND_ROOT / "app" / "data" / "nasdaq100_constituents.csv"


def _symbols_from_frame(frame: pd.DataFrame, limit: int) -> list[str]:
    if "Symbol" not in frame.columns:
        raise SourceError("constituent file missing Symbol column")
    symbols = (
        frame["Symbol"]
        .dropna()
        .astype(str)
        .str.strip()
        .str.replace(".", "-", regex=False)
        .drop_duplicates()
        .tolist()
    )
    if not symbols:
        raise SourceError("constituent list is empty")
    return symbols[:limit]


def _load_constituents(settings: Settings, client: HttpClient) -> list[str]:
    text = client.get_text(settings.constituents_url)
    return _symbols_from_frame(pd.read_csv(StringIO(text)), settings.breadth_max_tickers)


def _load_nasdaq_constituents(
    settings: Settings, client: HttpClient, seed_path: Path = NASDAQ100_SEED_PATH
) -> list[str]:
    """NASDAQ-100 members: a configured CSV URL (``Symbol`` column) wins, else the bundled list."""
    if settings.nasdaq_constituents_url:
        try:
            text = client.get_text(settings.nasdaq_constituents_url)
            return _symbols_from_frame(pd.read_csv(StringIO(text)), settings.nasdaq_max_tickers)
        except Exception as exc:
            logger.warning("NASDAQ constituent URL failed, using bundled list: %s", exc)
    return _symbols_from_frame(pd.read_csv(seed_path), settings.nasdaq_max_tickers)


def _compute_breadth(
    settings: Settings,
    symbols: list[str],
    indicator_id: str,
    source: str,
    min_constituents: int,
    bias_note: str,
) -> SeriesResult:
    """Daily share of ``symbols`` closing above their own 200-day simple moving average."""
    try:
        import yfinance as yf
    except Exception as exc:
        return SeriesResult(
            indicator_id=indicator_id,
            status="error",
            message=f"yfinance is not available: {exc}",
            source=source,
        )

    total_above = pd.Series(dtype="float64")
    total_count = pd.Series(dtype="float64")
    failed_chunks = 0
    chunk_size = max(20, settings.breadth_chunk_size)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        for start in range(0, len(symbols), chunk_size):
            chunk = symbols[start : start + chunk_size]
            try:
                data = yf.download(
                    chunk,
                    period=f"{settings.breadth_history_years}y",
                    interval="1d",
                    auto_adjust=True,
                    progress=False,
                    threads=True,
                    group_by="column",
                )
            except Exception as exc:
                failed_chunks += 1
                logger.warning("breadth chunk %s failed: %s", start, exc)
                continue
            if data is None or data.empty:
                failed_chunks += 1
                continue
            try:
                close = data["Close"]
            except Exception:
                failed_chunks += 1
                continue
            if isinstance(close, pd.Series):
                close = close.to_frame()
            close = close.dropna(how="all")
            if close.empty:
                failed_chunks += 1
                continue
            moving_average = close.rolling(200, min_periods=200).mean()
            valid = moving_average.notna()
            above = (close > moving_average) & valid
            total_above = total_above.add(above.sum(axis=1), fill_value=0)
            total_count = total_count.add(valid.sum(axis=1), fill_value=0)

    if total_count.empty:
        raise SourceError("breadth calculation returned no observations")

    breadth = (total_above / total_count.replace(0, pd.NA) * 100.0).dropna()
    breadth = breadth[total_count.reindex(breadth.index) >= min_constituents]
    if breadth.empty:
        raise SourceError(
            "breadth calculation did not reach the minimum constituent count "
            f"({min_constituents})"
        )

    rows = []
    for timestamp, value in breadth.items():
        day = timestamp.date() if hasattr(timestamp, "date") else timestamp
        rows.append(
            {
                "period_date": day,
                "effective_date": day,
                "value": float(value),
                "is_estimate": False,
                "source": source,
                "meta": {
                    "above": int(total_above.loc[timestamp]),
                    "constituents": int(total_count.loc[timestamp]),
                    "snapshot_date": date.today().isoformat(),
                    "history_years": settings.breadth_history_years,
                    "bias": bias_note,
                },
            }
        )
    observations = make_frame(rows)
    message = f"Computed {len(observations)} daily breadth observations from {len(symbols)} symbols"
    if failed_chunks:
        message += f" ({failed_chunks} chunk(s) failed)"
    return SeriesResult(
        indicator_id=indicator_id,
        status="ok",
        observations=observations,
        source=source,
        message=message,
    )


def fetch_breadth(settings: Settings, client: HttpClient) -> SeriesResult:
    source = "Yahoo Finance / current S&P 500 constituents"
    if not settings.breadth_enabled:
        return SeriesResult(
            indicator_id="breadth_200dma",
            status="skipped",
            message="Breadth ingestion is disabled by configuration.",
            source="Current S&P 500 constituents",
        )
    try:
        symbols = _load_constituents(settings, client)
    except Exception as exc:
        raise SourceError(f"could not load constituents: {exc}") from exc
    return _compute_breadth(
        settings,
        symbols,
        "breadth_200dma",
        source,
        settings.breadth_min_constituents,
        "current constituents, survivorship-biased",
    )


def fetch_nasdaq_breadth(settings: Settings, client: HttpClient) -> SeriesResult:
    source = "Yahoo Finance / current NASDAQ-100 constituents"
    if not settings.breadth_enabled:
        return SeriesResult(
            indicator_id="nasdaq_breadth_200dma",
            status="skipped",
            message="Breadth ingestion is disabled by configuration.",
            source="Current NASDAQ-100 constituents",
        )
    try:
        symbols = _load_nasdaq_constituents(settings, client)
    except Exception as exc:
        raise SourceError(f"could not load NASDAQ-100 constituents: {exc}") from exc
    return _compute_breadth(
        settings,
        symbols,
        "nasdaq_breadth_200dma",
        source,
        settings.nasdaq_breadth_min_constituents,
        "current NASDAQ-100 constituents, survivorship-biased",
    )
