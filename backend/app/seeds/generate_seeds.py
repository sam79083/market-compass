"""
generate-seeds: Download free public data for initial database population.

This script queries free public data sources and creates a JSON seed file
that can be loaded into a fresh database via `load-seeds` or `init-db --seed`.

Usage:
    python -m app.seeds.generate_seeds --out data/seeds.json
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
import time
import warnings
from datetime import date, timedelta
from io import BytesIO
from pathlib import Path
from typing import Any

import pandas as pd

from app.config import Settings, get_settings
from app.ingestion.base import make_frame
from app.ingestion.fetch import HttpClient
from app.ingestion.shiller import _month_end

logger = logging.getLogger(__name__)


def fetch_shiller_for_seed(client: HttpClient, settings: Settings) -> list[dict]:
    """Fetch Shiller workbook and return CAPE + earnings_yield + CPI observations."""
    try:
        import re, html as html_module
        from urllib.parse import urljoin

        try:
            page = client.get_text(settings.shiller_index_url)
            matches = re.findall(r'href=["\']([^"\']*ie_data\.xls[^"\']*)["\']', page)
            if matches:
                candidate = html_module.unescape(matches[0])
                if candidate.startswith("//"):
                    candidate = "https:" + candidate
                url = urljoin(settings.shiller_index_url, candidate)
            else:
                url = settings.shiller_fallback_url
        except Exception:
            url = settings.shiller_fallback_url

        payload = client.get_bytes(url)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            frame = pd.read_excel(BytesIO(payload), sheet_name="Data", header=None, engine="xlrd")
    except Exception as exc:
        logger.warning("Shiller seed fetch failed: %s", exc)
        return []

    header_index = None
    for idx in range(min(20, len(frame))):
        row = frame.iloc[idx]
        if str(row.iloc[0]).strip() == "Date" and str(row.iloc[1]).strip() == "P":
            header_index = idx
            break

    if header_index is None:
        logger.warning("Shiller seed: header row not found")
        return []

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
        period = _month_end(year, month)

        price = pd.to_numeric(row.iloc[1], errors="coerce")
        earnings = pd.to_numeric(row.iloc[3], errors="coerce")
        cape_val = pd.to_numeric(row.iloc[12], errors="coerce")
        cpi_val = pd.to_numeric(row.iloc[4], errors="coerce")

        if pd.notna(cape_val) and float(cape_val) > 0:
            cape_rows.append({
                "indicator_id": "cape",
                "period_date": period,
                "effective_date": period + timedelta(days=30),
                "value": float(cape_val),
                "is_estimate": False,
                "source": "Robert Shiller / shillerdata.com (seed)",
                "meta": {
                    "price": float(price) if pd.notna(price) else None,
                    "earnings": float(earnings) if pd.notna(earnings) else None,
                },
            })

        if pd.notna(price) and pd.notna(earnings) and float(price) > 0 and float(earnings) > 0:
            earnings_rows.append({
                "indicator_id": "earnings_yield",
                "period_date": period,
                "effective_date": period + timedelta(days=60),
                "value": float(earnings) / float(price) * 100.0,
                "is_estimate": False,
                "source": "Robert Shiller / shillerdata.com (seed)",
                "meta": {"earnings": float(earnings), "price": float(price)},
            })

        if pd.notna(cpi_val) and float(cpi_val) > 0:
            cpi_rows.append({
                "indicator_id": "cpi",
                "period_date": period,
                "effective_date": period + timedelta(days=30),
                "value": float(cpi_val),
                "is_estimate": False,
                "source": "Robert Shiller / shillerdata.com (seed)",
                "meta": {"definition": "CPI-U, Shiller workbook"},
            })

    return cape_rows + earnings_rows + cpi_rows


def fetch_vix_seed(client: HttpClient) -> list[dict]:
    """Fetch VIX history from Cboe public CSV."""
    try:
        text = client.get_text("https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv")
        frame = pd.read_csv(pd.io.common.StringIO(text))
    except Exception as exc:
        logger.warning("VIX seed fetch failed: %s", exc)
        return []

    required = {"DATE", "CLOSE"}
    if not required.issubset(set(frame.columns)):
        logger.warning("VIX CSV missing columns")
        return []

    frame["period_date"] = pd.to_datetime(frame["DATE"], format="%m/%d/%Y", errors="coerce")
    frame["value"] = pd.to_numeric(frame["CLOSE"], errors="coerce")
    frame = frame.dropna(subset=["period_date", "value"])
    frame = frame[frame["period_date"] >= pd.Timestamp("2000-01-01")]

    return [{
        "indicator_id": "vix",
        "period_date": row.period_date.date(),
        "effective_date": row.period_date.date(),
        "value": float(row.value),
        "is_estimate": False,
        "source": "Cboe Global Markets (seed)",
        "meta": {},
    } for row in frame.itertuples()]


def fetch_treasury_seed(client: HttpClient) -> list[dict]:
    """Fetch Treasury 10Y yields (1990+)."""
    all_rows = []
    current_year = date.today().year

    for year in range(1990, current_year + 1):
        try:
            url = (
                f"https://home.treasury.gov/resource-center/data-chart-center/"
                f"interest-rates/daily-treasury-rates.csv"
                f"?type=daily_treasury_yield_curve"
                f"&field_tdr_date_value={year}"
                f"&page&_format=csv"
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
            logger.warning("Treasury year %d failed: %s", year, exc)

    return all_rows


def fetch_yahoo_prices(client: HttpClient, settings: Settings) -> list[dict]:
    """Fetch ^GSPC, RSP, SPY prices from Yahoo Finance."""
    rows = []
    for symbol, indicator_id in [("^GSPC", "sp500_price"), ("RSP", "rsp"), ("SPY", "spy")]:
        try:
            from urllib.parse import quote
            encoded = quote(symbol, safe="")
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded}"
            payload = client.get_json(url, params={
                "period1": 0,
                "period2": int(time.time()),
                "interval": "1d",
                "includeAdjustedClose": "true",
            })
            chart = payload.get("chart") if isinstance(payload, dict) else {}
            if not chart or chart.get("error") or not chart.get("result"):
                logger.warning("Yahoo seed: no result for %s", symbol)
                continue
            result = chart["result"][0]
            timestamps = result.get("timestamp") or []
            indicators = result.get("indicators") or {}
            quotes = (indicators.get("quote") or [{}])[0]
            closes = quotes.get("close") or []
            adj_series = (indicators.get("adjclose") or [{}])[0]
            adjusted = adj_series.get("adjclose") or []

            for idx_ts, ts in enumerate(timestamps):
                close = closes[idx_ts] if idx_ts < len(closes) else None
                if close is None:
                    continue
                adj = adjusted[idx_ts] if idx_ts < len(adjusted) else close
                dt = date.fromtimestamp(ts)
                rows.append({
                    "indicator_id": indicator_id,
                    "period_date": dt,
                    "effective_date": dt,
                    "value": float(adj) if adj is not None else float(close),
                    "is_estimate": False,
                    "source": f"Yahoo Finance / {symbol} (seed)",
                    "meta": {"close": float(close), "adjclose": float(adj) if adj is not None else None, "symbol": symbol},
                })
            logger.info("Yahoo seed: %d rows for %s", len([r for r in rows if r["indicator_id"] == indicator_id]), symbol)
        except Exception as exc:
            logger.warning("Yahoo seed failed for %s: %s", symbol, exc)
    return rows


def fetch_buffett_for_seed(client: HttpClient, settings: Settings) -> list[dict]:
    """Fetch World Bank market-cap/GDP for Buffett indicator."""
    try:
        payload = client.get_json(settings.worldbank_url, params={"format": "json", "per_page": 100})
    except Exception as exc:
        logger.warning("World Bank seed fetch failed: %s", exc)
        return []

    if not isinstance(payload, list) or len(payload) < 2 or not payload[1]:
        return []

    rows = []
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
        rows.append({
            "indicator_id": "buffett",
            "period_date": period,
            "effective_date": period + timedelta(days=270),
            "value": numeric,
            "is_estimate": year >= current_year - 1,
            "source": "World Bank / WFE (seed)",
            "meta": {"market_cap_definition": "listed domestic companies", "gdp_definition": "nominal GDP"},
        })
    return rows


def generate_seeds(out_path: str | Path | None = None) -> dict[str, Any]:
    """
    Generate seed data by querying free public APIs.

    This pulls:
    - Shiller CAPE, earnings_yield, CPI
    - VIX history from Cboe
    - Treasury 10Y yields
    - ^GSPC, RSP, SPY prices from Yahoo Finance
    - Buffett indicator from World Bank

    Returns a JSON-serializable dict of all observations.
    Writes to out_path as JSON if provided.
    """
    settings = get_settings()
    rows = []

    with HttpClient(settings) as client:
        logger.info("Fetching Shiller CAPE...")
        rows.extend(fetch_shiller_for_seed(client, settings))

        logger.info("Fetching VIX...")
        rows.extend(fetch_vix_seed(client))

        logger.info("Fetching Treasury yields...")
        rows.extend(fetch_treasury_seed(client))

        logger.info("Fetching Yahoo prices...")
        rows.extend(fetch_yahoo_prices(client, settings))

        logger.info("Fetching Buffett indicator...")
        rows.extend(fetch_buffett_for_seed(client, settings))

    result = {"observations": rows, "generated_at": date.today().isoformat()}
    if out_path:
        out = Path(out_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(result, default=str), encoding="utf-8")
        logger.info("Seed data written to %s (%d observations)", out, len(rows))
    result["n_observations"] = len(rows)
    result["indicators"] = list(set(r["indicator_id"] for r in rows))
    return result


def create_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Generate seed data from free public APIs")
    p.add_argument("--out", default="data/seeds.json", help="Output path for seed JSON")
    return p


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    parser = create_parser()
    args = parser.parse_args(argv)
    result = generate_seeds(out_path=args.out)
    print(json.dumps(result, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
