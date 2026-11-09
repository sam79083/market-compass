"""Record today's NASDAQ-100 trailing P/E in a CSV, one row per run.

No free source publishes NASDAQ-100 earnings *history*, so this builds it going forward.
Output columns: date,value,source (matches backend/app/ingestion/csv_feed.py). A repeat run on
the same date replaces that day's row.

Source order:
  1. Yahoo Finance's trailing P/E for QQQ (the NASDAQ-100 ETF).
  2. If that is missing, the market-cap-weighted harmonic P/E of the NASDAQ-100 members
     (sum of market caps / sum of earnings), which excludes loss-makers like most index P/Es.

Usage (from repo root; needs yfinance, which backend/requirements.txt installs):
    python scripts/fetch_nasdaq_pe.py --out data/nasdaq_pe.csv
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import sys
from pathlib import Path

MIN_PE, MAX_PE = 5.0, 150.0  # sanity bounds; anything outside is treated as a bad reading
SEED = Path(__file__).resolve().parents[1] / "backend" / "app" / "data" / "nasdaq100_constituents.csv"


def valid_pe(value) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if MIN_PE <= number <= MAX_PE else None


def weighted_harmonic_pe(rows: list[tuple[float, float]]) -> float | None:
    """Aggregate P/E from (market_cap, trailing_pe) pairs: total market cap / total earnings.

    Pairs with a missing or non-positive P/E (loss-makers) or market cap are dropped.
    """
    cap = earnings = 0.0
    for market_cap, pe in rows:
        if not market_cap or market_cap <= 0 or not pe or pe <= 0:
            continue
        cap += market_cap
        earnings += market_cap / pe
    return valid_pe(cap / earnings) if earnings > 0 else None


def fetch_qqq_pe() -> float | None:
    import yfinance as yf

    return valid_pe(yf.Ticker("QQQ").info.get("trailingPE"))


def fetch_constituent_pe() -> float | None:
    import yfinance as yf

    with SEED.open(newline="", encoding="utf-8") as handle:
        symbols = [row["Symbol"].strip().replace(".", "-") for row in csv.DictReader(handle)]
    rows: list[tuple[float, float]] = []
    for symbol in symbols:
        try:
            info = yf.Ticker(symbol).info
            rows.append((info.get("marketCap"), info.get("trailingPE")))
        except Exception as exc:  # one bad ticker must not sink the run
            print(f"WARN {symbol}: {exc}", file=sys.stderr)
    print(f"constituent P/E from {len(rows)} of {len(symbols)} symbols", flush=True)
    return weighted_harmonic_pe(rows)


def upsert(path: Path, day: str, value: float, source: str) -> None:
    """Add or replace the row for ``day``, keeping the file sorted by date."""
    rows: dict[str, tuple[str, str]] = {}
    if path.exists():
        with path.open(newline="", encoding="utf-8") as handle:
            for row in csv.DictReader(handle):
                rows[row["date"]] = (row["value"], row.get("source", ""))
    rows[day] = (f"{value:.2f}", source)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["date", "value", "source"])
        for key in sorted(rows):
            writer.writerow([key, *rows[key]])


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    value, source = None, ""
    try:
        value, source = fetch_qqq_pe(), "Yahoo Finance QQQ trailing P/E"
    except Exception as exc:
        print(f"WARN QQQ P/E failed: {exc}", file=sys.stderr)
    if value is None:
        try:
            value, source = fetch_constituent_pe(), "NASDAQ-100 constituents, cap-weighted P/E"
        except Exception as exc:
            print(f"WARN constituent P/E failed: {exc}", file=sys.stderr)
    if value is None:
        print("ERROR no NASDAQ-100 P/E could be read", file=sys.stderr)
        return 1

    today = dt.date.today().isoformat()
    upsert(Path(args.out), today, value, source)
    print(f"{today}: NASDAQ-100 trailing P/E {value:.2f} ({source})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
