"""Append FactSet Earnings Insight's weekly S&P 500 forward 12-month P/E to a CSV.

Output columns: date,value,release_date   (matches backend/app/ingestion/csv_feed.py)
Do NOT add a `ticker` column: csv_feed keeps only rows whose ticker == "forward_pe".

Usage (from repo root):
    pip install requests pypdf
    python scripts/fetch_forward_pe.py --out data/forward_pe.csv            # last 21 days
    python scripts/fetch_forward_pe.py --out data/forward_pe.csv --since 2019-01-01   # backfill
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import re
import sys
import time
from io import BytesIO
from pathlib import Path

BASE = (
    "https://advantage.factset.com/hubfs/Website/Resources%20Section/"
    "Research%20Desk/Earnings%20Insight/EarningsInsight_{stamp}{suffix}.pdf"
)
SUFFIXES = ["", "A", "B", "C"]  # some weeks have EarningsInsight_120823A.pdf style names
PE_RE = re.compile(r"forward 12-month P/E ratio (?:for the S&P 500 )?is (\d{1,2}(?:\.\d+)?)", re.I)
MIN_PE, MAX_PE = 5.0, 60.0  # sanity bounds; anything outside is treated as a parse error
HEADERS = {"User-Agent": "market-compass-refresh/1.0"}


def parse_forward_pe(text: str) -> float | None:
    """Return the first 'forward 12-month P/E ratio ... is X' value found in report text."""
    m = PE_RE.search(re.sub(r"\s+", " ", text))
    if not m:
        return None
    value = float(m.group(1))
    return value if MIN_PE <= value <= MAX_PE else None


def fetch_report_text(day: dt.date) -> str | None:
    import requests
    from pypdf import PdfReader

    stamp = day.strftime("%m%d%y")
    for suffix in SUFFIXES:
        resp = requests.get(BASE.format(stamp=stamp, suffix=suffix), headers=HEADERS, timeout=30)
        if resp.status_code == 200 and resp.content[:4] == b"%PDF":
            reader = PdfReader(BytesIO(resp.content))
            return "\n".join((page.extract_text() or "") for page in reader.pages[:3])
    return None


def merge_rows(path: Path, new_rows: dict[str, float]) -> int:
    rows: dict[str, str] = {}
    if path.exists():
        with path.open(newline="", encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                rows[r["date"]] = r["value"]
    added = 0
    for d, v in new_rows.items():
        if d not in rows:
            rows[d] = f"{v:.2f}"
            added += 1
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh, lineterminator="\n")
        w.writerow(["date", "value", "release_date"])
        for d in sorted(rows):
            w.writerow([d, rows[d], d])  # release_date = report date, avoids look-ahead
    return added


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--since", help="YYYY-MM-DD; default = 21 days ago")
    args = ap.parse_args()

    end = dt.date.today()
    start = dt.date.fromisoformat(args.since) if args.since else end - dt.timedelta(days=21)
    found: dict[str, float] = {}
    day = start
    while day <= end:
        # Reports are normally Friday; holiday weeks shift to Wed/Thu, so also try those.
        if day.weekday() in (2, 3, 4):
            text = fetch_report_text(day)
            if text:
                value = parse_forward_pe(text)
                if value is not None:
                    found[day.isoformat()] = value
                else:
                    print(f"WARN {day}: report found but P/E sentence not parsed", file=sys.stderr)
            time.sleep(0.5)
        day += dt.timedelta(days=1)

    added = merge_rows(Path(args.out), found)
    print(f"found {len(found)} reports, added {added} new rows -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
