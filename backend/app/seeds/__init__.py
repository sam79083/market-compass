from __future__ import annotations

import json
import logging
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import pandas as pd

from app.config import Settings
from app.ingestion.base import make_frame
from app.ingestion.fetch import HttpClient
from app.ingestion.shiller import _resolve_url
from app.scoring.percentile import component_history, score_dates_from_prices

logger = logging.getLogger(__name__)

# Minimum observation thresholds that still produce useful (if imperfect) scores.
# This is separate from the production thresholds in weights.json.
# When a dataset has fewer observations than WEIGHTS.min_observations but exceeds
# SEED_MIN_OBS, we cap the reported window_years_used and flag the score as partial.
SEED_MIN_OBS = {
    "cape": 30,
    "forward_pe": 0,
    "buffett": 1,
    "erp": 0,
    "fear_greed": 0,
    "vix": 30,
    "rsi": 30,
    "ma200_deviation": 30,
    "breadth_200dma": 30,
    "ew_cw_relative": 30,
    "earnings_yield": 30,       # for ERP computation
    "sp500_price": 30,          # for derived indicators
}

# The minimum score dates with at least minimum_coverage indicators to produce
# a composite. With partial data this is lower.
COMPOSITE_MIN_COVERAGE = 0.3


def fetch_vix_history(client: HttpClient) -> list[dict]:
    """Fetch VIX history from Cboe public CSV."""
    url = "https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv"
    try:
        text = client.get_text(url)
        frame = pd.read_csv(pd.io.common.StringIO(text))
    except Exception as exc:
        logger.warning("VIX seed fetch failed: %s", exc)
        return []

    required = {"DATE", "CLOSE"}
    if not required.issubset(set(frame.columns)):
        logger.warning("VIX CSV missing required columns")
        return []

    frame["period_date"] = pd.to_datetime(frame["DATE"], format="%m/%d/%Y", errors="coerce")
    frame["value"] = pd.to_numeric(frame["CLOSE"], errors="coerce")
    frame = frame.dropna(subset=["period_date", "value"])
    frame = frame[frame["period_date"] >= pd.Timestamp("2020-01-01")]

    return [
        {
            "indicator_id": "vix",
            "period_date": row.period_date.date(),
            "effective_date": row.period_date.date(),
            "value": float(row.value),
            "is_estimate": False,
            "source": "Cboe Global Markets (seed)",
            "meta": {},
        }
        for row in frame.itertuples()
    ]


def fetch_treasury_seed(client: HttpClient) -> list[dict]:
    """Fetch Treasury yield history seeded from recent years only."""
    current_year = date.today().year
    all_rows = []
    start_year = max(1990, current_year - 6)  # seed 6 years of data
    yield_url = (
        f"https://home.treasury.gov/resource-center/data-chart-center/interest-rates/"
        f"daily-treasury-rates.csv?field_tdr_date_value={start_year}&page&_format=csv"
    )

    # For seed data, fetch a broader range by looping through individual years
    # but only keep recent 6 years to avoid excessive network calls
    for year in range(start_year, current_year + 1):
        try:
            url = (
                f"https://home.treasury.gov/resource-center/data-chart-center/"
                f"interest-rates/daily-treasury-rates.csv?type=daily_treasury_yield_curve"
                f"&field_tdr_date_value={year}&page&_format=csv"
            )
            text = client.get_text(url)
            frame = pd.read_csv(pd.io.common.StringIO(text))
            if "Date" not in frame.columns:
                continue
            yield_col = next((c for c in frame.columns if str(c).strip().lower() == "10 yr"), None)
            if yield_col is None:
                continue
            frame["period_date"] = pd.to_datetime(frame["Date"], format="%m/%d/%Y", errors="coerce")
            frame["value"] = pd.to_numeric(frame[yield_col], errors="coerce")
            frame = frame.dropna(subset=["period_date", "value"])
            for row in frame.itertuples():
                all_rows.append({
                    "indicator_id": "treasury_10y",
                    "period_date": row.period_date.date(),
                    "effective_date": row.period_date.date(),
                    "value": float(row.value),
                    "is_estimate": False,
                    "source": "U.S. Treasury (seed)",
                    "meta": {},
                })
        except Exception as exc:
            logger.warning("Treasury year %d seed fetch failed: %s", year, exc)
            continue
    return all_rows


def fetch_shiller_cape_seed(client: HttpClient, settings: Settings) -> dict[str, list[dict]]:
    """Fetch Shiller CAPE data for seed population."""
    try:
        url = _resolve_url(settings, client)
        import warnings
        from io import BytesIO
        payload = client.get_bytes(url)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            frame = pd.read_excel(BytesIO(payload), sheet_name="Data", header=None, engine="xlrd")
    except Exception as exc:
        logger.warning("Shiller seed fetch failed: %s", exc)
        return {"cape": [], "earnings_yield": [], "cpi": []}

    header_index = None
    for idx in range(min(20, len(frame))):
        row = frame.iloc[idx]
        if str(row.iloc[0]).strip() == "Date" and str(row.iloc[1]).strip() == "P":
            header_index = idx
            break

    if header_index is None:
        logger.warning("Shiller seed: header row not found")
        return {"cape": [], "earnings_yield": [], "cpi": []}

    cape_rows = []
    earnings_rows = []
    cpi_rows = []

    for _, row in frame.iloc[header_index + 1 :].iterrows():
        fraction = pd.to_numeric(row.iloc[5], errors="coerce")
        if pd.isna(fraction):
            continue
        year = int(fraction)
        month = int(round((float(fraction) - year) * 12 + 0.5))
        if not 1 <= month <= 12:
            continue
        from app.ingestion.shiller import _month_end
        period = _month_end(year, month)

        # Only seed recent data (last 20 years) for faster generation
        if period < date(date.today().year - 20, 1, 1):
            continue

        price = pd.to_numeric(row.iloc[1], errors="coerce")
        earnings = pd.to_numeric(row.iloc[3], errors="coerce")
        cape_val = pd.to_numeric(row.iloc[12], errors="coerce")
        cpi = pd.to_numeric(row.iloc[4], errors="coerce")

        if pd.notna(cape_val) and float(cape_val) > 0:
            cape_rows.append({
                "indicator_id": "cape",
                "period_date": period,
                "effective_date": period.replace(day=min(28, period.day)) if period.month < 4 else period,
                "value": float(cape_val),
                "is_estimate": False,
                "source": "Robert Shiller / shillerdata.com (seed)",
                "meta": {"price": float(price) if pd.notna(price) else None, "earnings": float(earnings) if pd.notna(earnings) else None},
            })

        if pd.notna(price) and pd.notna(earnings) and float(price) > 0 and float(earnings) > 0:
            earnings_rows.append({
                "indicator_id": "earnings_yield",
                "period_date": period,
                "effective_date": period.replace(day=min(28, period.day)) if period.month < 4 else period,
                "value": float(earnings) / float(price) * 100.0,
                "is_estimate": False,
                "source": "Robert Shiller / shillerdata.com (seed)",
                "meta": {"earnings": float(earnings), "price": float(price)},
            })

        if pd.notna(cpi) and float(cpi) > 0:
            cpi_rows.append({
                "indicator_id": "cpi",
                "period_date": period,
                "effective_date": period,
                "value": float(cpi),
                "is_estimate": False,
                "source": "Robert Shiller / shillerdata.com (seed)",
                "meta": {"definition": "CPI-U, Shiller workbook"},
            })

    return {"cape": cape_rows, "earnings_yield": earnings_rows, "cpi": cpi_rows}


def generate_seed_data(out_path: str | Path | None = None) -> dict[str, Any]:
    """
    Generate seed data by querying free public APIs.

    Returns a dictionary with all Observations needed to bootstrap a new database.
    Writes to out_path as JSON if provided.
    """
    from app.config import get_settings

    settings = get_settings()
    rows = []

    with HttpClient(settings) as client:
        # Shiller CAPE (free -- the Excel file is public)
        logger.info("Fetching Shiller CAPE history for seed data...")
        shiller = fetch_shiller_cape_seed(client, settings)
        for key, shard in shiller.items():
            rows.extend(shard)

        # VIX (free CSV)
        logger.info("Fetching VIX history for seed data...")
        rows.extend(fetch_vix_history(client))

        # Treasury (free API)
        logger.info("Fetching Treasury yields for seed data...")
        rows.extend(fetch_treasury_seed(client))

        # World Bank Buffett (free API)
        logger.info("Fetching World Bank data for seed data...")
        try:
            payload = client.get_json(
                settings.worldbank_url,
                params={"format": "json", "per_page": 100},
            )
            if isinstance(payload, list) and len(payload) > 1 and payload[1]:
                current_year = date.today().year
                for item in payload[1]:
                    year_raw = item.get("date")
                    value = item.get("value")
                    if year_raw is None or value is None:
                        continue
                    try:
                        year = int(year_raw)
                        numeric = float(value)
                    except (TypeError, ValueError):
                        continue
                    if year < 1975 or numeric <= 0:
                        continue
                    period = date(year, 12, 31)
                    if period < date(current_year - 1, 12, 31):
                        continue
                    rows.append({
                        "indicator_id": "buffett",
                        "period_date": period,
                        "effective_date": period + timedelta(days=270),
                        "value": numeric,
                        "is_estimate": year >= current_year - 1,
                        "source": "World Bank / World Federation of Exchanges (seed)",
                        "meta": {"market_cap_definition": "listed domestic companies", "gdp_definition": "nominal GDP"},
                    })
        except Exception as exc:
            logger.warning("World Bank seed fetch failed: %s", exc)

        # Yahoo Finance price data for ^GSPC, RSP, SPY (free unofficial API)
        for symbol, indicator_id in [("^GSPC", "sp500_price"), ("RSP", "rsp"), ("SPY", "spy")]:
            logger.info("Fetching %s price data for seed data...", symbol)
            try:
                import time
                encoded = __import__("urllib.parse", fromlist=["quote"]).quote(symbol, safe="")
                url = f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded}"
                payload = client.get_json(url, params={
                    "period1": 0,
                    "period2": int(time.time()),
                    "interval": "1d",
                    "includeAdjustedClose": "true",
                })
                chart = payload.get("chart") if isinstance(payload, dict) else None
                if chart and not chart.get("error") and chart.get("result"):
                    result = chart["result"][0]
                    timestamps = result.get("timestamp") or []
                    indicators = result.get("indicators") or {}
                    quotes = (indicators.get("quote") or [{}])[0]
                    closes = quotes.get("close") or []
                    adj_series = (indicators.get("adjclose") or [{}])[0]
                    adjusted = adj_series.get("adjclose") or []

                    yahoo_rows = []
                    for idx_ts, ts in enumerate(timestamps):
                        close = closes[idx_ts] if idx_ts < len(closes) else None
                        if close is None:
                            continue
                        adj = adjusted[idx_ts] if idx_ts < len(adjusted) else close
                        import datetime as _dt
                        dt = _dt.datetime.fromtimestamp(ts, tz=__import__("datetime", fromlist=["UTC"]).UTC).date()
                        yahoo_rows.append({
                            "indicator_id": indicator_id,
                            "period_date": dt,
                            "effective_date": dt,
                            "value": float(adj),
                            "is_estimate": False,
                            "source": f"Yahoo Finance / {symbol} (seed)",
                            "meta": {"close": float(closes[idx_ts]), "adjclose": float(adj), "symbol": symbol},
                        })
                    rows.extend(yahoo_rows)
            except Exception as exc:
                logger.warning("Yahoo seed fetch failed for %s: %s", symbol, exc)

    if out_path:
        out = Path(out_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps({"observations": rows}, default=str), encoding="utf-8")
        logger.info("Seed data written to %s (%d observations)", out, len(rows))

    return {"n_observations": len(rows), "indicators": list(set(r["indicator_id"] for r in rows))}
