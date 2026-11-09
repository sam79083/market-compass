"""Append FactSet Earnings Insight's weekly S&P 500 forward 12-month P/E to a CSV.

Output columns: date,value,release_date (matches backend/app/ingestion/csv_feed.py)

Do NOT add a `ticker` column: csv_feed keeps only rows whose ticker == "forward_pe".

Usage (from repo root):
    pip install requests pypdf
    python scripts/fetch_forward_pe.py --out data/forward_pe.csv                   # last 21 days
    python scripts/fetch_forward_pe.py --out data/forward_pe.csv --since 2019-01-01  # backfill
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import re
import sys
import time
import unicodedata
from io import BytesIO
from pathlib import Path

BASE = (
    "https://advantage.factset.com/hubfs/Website/Resources%20Section/"
    "Research%20Desk/Earnings%20Insight/{prefix}{stamp}{suffix}.pdf"
)
PREFIXES = ["EarningsInsight_", "Earnings_Insight_"]  # naming changed in some 2026 reports
SUFFIXES = ["", "A", "B", "C"]  # some weeks have EarningsInsight_120823A.pdf style names

# Some PDFs extract with stray spaces inside the number ("2 1.5" for 21.5), so the
# value pattern tolerates a space between digits; whitespace is stripped before float().
NUM = r"(\d(?:\s?\d)?(?:\s?\.\s?\d+)?)"
NUM_1DP = r"(\d(?:\s?\d)?\s?\.\s?\d)"

# Tolerant of hyphen variants, "P / E", "was/of" instead of "is", and a missing "ratio"/"for the S&P 500".
PE_RE = re.compile(
    r"forward\s*12\s*-?\s*month\s+P\s*/\s*E(?:\s+ratio)?(?:\s+for\s+the\s+S&P\s*500)?"
    r"\s+(?:is|was|of)\s+" + NUM,
    re.I,
)
# Last resort: first one-decimal number shortly after the phrase.
FALLBACK_RE = re.compile(r"forward\s*12\s*-?\s*month\s+P\s*/\s*E.{0,150}?" + NUM_1DP, re.I)

MIN_PE, MAX_PE = 5.0, 60.0  # sanity bounds; anything outside is treated as a parse error
HEADERS = {"User-Agent": "market-compass-refresh/1.0"}


def _norm(text: str) -> str:
    """Normalize unicode, unify hyphen-like characters, collapse whitespace."""
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"[\u00ad\u2010-\u2015\u2212]", "-", text)  # soft/en/em/minus -> "-"
    return re.sub(r"\s+", " ", text)


def parse_forward_pe(text: str) -> float | None:
    """Return the forward 12-month P/E value found in report text, or None."""
    text = _norm(text)
    for rx in (PE_RE, FALLBACK_RE):
        m = rx.search(text)
        if m:
            value = float(re.sub(r"\s+", "", m.group(1)))
            if MIN_PE <= value <= MAX_PE:
                return value
    return None


STATUS: dict[str, int] = {}  # HTTP status -> count, reset each month in main()


def fetch_report_text(day: dt.date) -> str | None:
    import requests
    from pypdf import PdfReader

    stamp = day.strftime("%m%d%y")
    for prefix, suffix in ((p, x) for p in PREFIXES for x in SUFFIXES):
        try:
            resp = requests.get(
                BASE.format(prefix=prefix, stamp=stamp, suffix=suffix), headers=HEADERS, timeout=30
            )
        except requests.RequestException as exc:
            print(f"WARN {day}: request failed ({exc.__class__.__name__})", file=sys.stderr)
            continue
        STATUS[str(resp.status_code)] = STATUS.get(str(resp.status_code), 0) + 1
        if resp.status_code == 200 and resp.content[:4] == b"%PDF":
            try:
                reader = PdfReader(BytesIO(resp.content))
                # Read every page: older reports may place the P/E paragraph later.
                return "\n".join((page.extract_text() or "") for page in reader.pages)
            except Exception as exc:  # corrupt/odd PDF should not abort a long backfill
                print(f"WARN {day}: PDF read failed ({exc.__class__.__name__})", file=sys.stderr)
                return None
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
    last_month = None
    while day <= end:
        if (day.year, day.month) != last_month:
            last_month = (day.year, day.month)
            print(f"... scanning {day:%Y-%m} (found {len(found)} so far; HTTP statuses so far: {STATUS})", flush=True)
        # Reports are normally Friday; holiday weeks shift to Wed/Thu, so also try those.
        if day.weekday() in (2, 3, 4):
            text = fetch_report_text(day)
            if text:
                value = parse_forward_pe(text)
                if value is not None:
                    found[day.isoformat()] = value
                else:
                    t = _norm(text)
                    i = t.lower().find("p/e")
                    snippet = t[max(0, i - 100): i + 300] if i >= 0 else "no 'P/E' text found in PDF"
                    print(f"WARN {day}: report found but P/E sentence not parsed. snippet: {snippet}",
                          file=sys.stderr)
                time.sleep(0.5)
        day += dt.timedelta(days=1)

    added = merge_rows(Path(args.out), found)
    print(f"found {len(found)} reports, added {added} new rows -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())