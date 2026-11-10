"""Append the CNN Fear & Greed Index history to a CSV.

Output columns: date,value,release_date (matches backend/app/ingestion/csv_feed.py)

NOTE: this uses CNN's unofficial dataviz endpoint (the one behind the public chart).
It is not a documented or licensed API and may change or block automated clients, so the
workflow step that calls it is continue-on-error. Replace it with a licensed feed
(FEAR_GREED_CSV_URL secret) if you rely on this index.

Usage (from repo root):
    pip install -r scripts/requirements.txt
    python scripts/fetch_fear_greed.py --out data/fear_greed.csv
    python scripts/fetch_fear_greed.py --out data/fear_greed.csv --since 2020-07-14
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import sys
from pathlib import Path

URL = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata/{start}"
EARLIEST = "2020-07-14"  # the endpoint has no history before this date
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    ),
    "Accept": "application/json",
    "Origin": "https://edition.cnn.com",
    "Referer": "https://edition.cnn.com/",
}


def parse_history(payload: dict) -> dict[str, float]:
    """Turn the endpoint's JSON into {YYYY-MM-DD: value}; later points win for a repeated day."""
    points = (payload.get("fear_and_greed_historical") or {}).get("data") or []
    out: dict[str, float] = {}
    for item in points:
        try:
            ts = float(item["x"]) / 1000.0
            value = float(item["y"])
        except (KeyError, TypeError, ValueError):
            continue
        if not 0.0 <= value <= 100.0:
            continue
        day = dt.datetime.fromtimestamp(ts, tz=dt.timezone.utc).date().isoformat()
        out[day] = round(value, 2)
    return out


def fetch(start: str) -> dict[str, float]:
    import requests

    resp = requests.get(URL.format(start=start), headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return parse_history(resp.json())


def merge_rows(path: Path, new_rows: dict[str, float]) -> int:
    rows: dict[str, str] = {}
    if path.exists():
        with path.open(newline="", encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                rows[r["date"]] = r["value"]
    added = sum(1 for d in new_rows if d not in rows)
    for d, v in new_rows.items():
        rows[d] = f"{v:.2f}"  # newest fetch wins: the latest day's value moves intraday
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh, lineterminator="\n")
        w.writerow(["date", "value", "release_date"])
        for d in sorted(rows):
            w.writerow([d, rows[d], d])
    return added


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--since", help=f"YYYY-MM-DD; default = {EARLIEST} (full history)")
    args = ap.parse_args()

    start = max(args.since or EARLIEST, EARLIEST)
    try:
        found = fetch(start)
    except Exception as exc:
        print(f"WARN fear & greed fetch failed ({exc.__class__.__name__}: {exc})", file=sys.stderr)
        return 1
    if not found:
        print("WARN fear & greed response had no valid points", file=sys.stderr)
        return 1
    added = merge_rows(Path(args.out), found)
    print(f"found {len(found)} days, added {added} new rows -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
