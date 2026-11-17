"""Fetch top-10 holdings (percent of net assets) for every tracked sector ETF.

Output: JSON with one entry per ETF, consumed by the backend (served at
/api/etf-holdings and copied into the static export as etf-holdings.json).

NOTE: this uses Yahoo Finance's unofficial quoteSummary `topHoldings` module (the one
behind the public ticker pages) together with a crumb/cookie handshake. It is not a
documented or licensed API and may change or block automated clients, so the workflow
step that calls it is continue-on-error. A symbol that fails to fetch keeps its rows
from the previous output file. Replace with a licensed holdings feed if you rely on it.

Usage (from repo root):
    pip install requests
    python scripts/fetch_etf_holdings.py --out data/etf_holdings.json \
        --static-out frontend/public/data/etf-holdings.json

When nothing changed versus the previous output file, the previous generated_at is
kept so an unchanged feed produces an identical file and CI commits nothing.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
import time
from pathlib import Path

SYMBOLS = [
    "XLE", "XLB", "XLI", "ITA", "XLF", "XLK", "XLC", "XLY", "XLP", "XLV",
    "XLRE", "XLU", "SOXX", "IGV", "CIBR", "XBI", "URA", "ICLN", "TLT", "GLD",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "*/*",
}


def make_session():
    import requests

    session = requests.Session()
    session.headers.update(HEADERS)
    return session


def crumb(session) -> str:
    # fc.yahoo.com hands out the A3 consent cookie that the crumb endpoint requires.
    session.get("https://fc.yahoo.com/", timeout=30, allow_redirects=True)
    resp = session.get("https://query1.finance.yahoo.com/v1/test/getcrumb", timeout=30)
    resp.raise_for_status()
    value = resp.text.strip()
    if not value or "<" in value:
        raise RuntimeError(f"unexpected crumb response: {value[:80]}")
    return value


def fetch_holdings(session, symbol: str, crumb_value: str, retries: int = 4) -> dict:
    url = f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{symbol}"
    params = {"modules": "topHoldings", "crumb": crumb_value}
    for attempt in range(retries):
        resp = session.get(url, params=params, timeout=30)
        if resp.status_code == 200:
            payload = resp.json()
            result = (payload.get("quoteSummary") or {}).get("result") or []
            if not result:
                error = (payload.get("quoteSummary") or {}).get("error")
                raise RuntimeError(f"quoteSummary returned no result for {symbol}: {error}")
            top = result[0].get("topHoldings") or {}
            holdings = []
            for item in top.get("holdings") or []:
                name = (item.get("holdingName") or "").strip()
                if not name:
                    continue
                raw = (item.get("holdingPercent") or {}).get("raw")
                try:
                    weight = float(raw) * 100.0
                except (TypeError, ValueError):
                    continue
                symbol_value = item.get("symbol") or None
                holdings.append(
                    {
                        "symbol": str(symbol_value) if symbol_value else None,
                        "name": name,
                        "weight": round(weight, 2),
                    }
                )
            return {"holdings": holdings}
        if resp.status_code == 429 and attempt < retries - 1:
            wait = 5 * (attempt + 1)
            print(f"WARN {symbol}: 429 rate limited, retrying in {wait}s", file=sys.stderr)
            time.sleep(wait)
            continue
        resp.raise_for_status()
    raise RuntimeError(f"unreachable for {symbol}")


def load_previous(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return payload if isinstance(payload, dict) else {}


def clean_holdings(holdings: list[dict]) -> list[dict]:
    cleaned = []
    for item in holdings:
        name = str(item.get("name") or "").strip()
        if not name:
            continue
        try:
            weight = float(item.get("weight"))
        except (TypeError, ValueError):
            continue
        if not 0.0 <= weight <= 100.0:
            continue
        symbol = item.get("symbol")
        cleaned.append(
            {
                "symbol": str(symbol) if symbol else None,
                "name": name,
                "weight": round(weight, 2),
            }
        )
    return cleaned


def build_payload(previous: dict, fetched: dict[str, dict]) -> dict:
    previous_etfs = previous.get("etfs") if isinstance(previous.get("etfs"), dict) else {}
    etfs: dict[str, dict] = {}
    for symbol in SYMBOLS:
        if symbol in fetched:
            etfs[symbol] = {"holdings": clean_holdings(fetched[symbol].get("holdings") or [])}
        elif symbol in previous_etfs:
            etfs[symbol] = {"holdings": clean_holdings(previous_etfs[symbol].get("holdings") or [])}
    # Keep the previous timestamp when nothing about the holdings changed, so an
    # unchanged feed produces an identical file (and the daily job commits nothing).
    if etfs == previous_etfs and previous.get("generated_at"):
        generated_at = str(previous["generated_at"])
    else:
        generated_at = dt.datetime.now(dt.UTC).isoformat(timespec="seconds")
    return {
        "generated_at": generated_at,
        "source": "Yahoo Finance topHoldings (unofficial)",
        "etfs": etfs,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument(
        "--static-out",
        help="Also write a compact etf-holdings.json for the static frontend (optional)",
    )
    args = ap.parse_args()

    out_path = Path(args.out)
    previous = load_previous(out_path)

    session = make_session()
    try:
        crumb_value = crumb(session)
    except Exception as exc:
        print(f"WARN crumb handshake failed ({exc.__class__.__name__}: {exc})", file=sys.stderr)
        if previous:
            print("keeping previous holdings file", file=sys.stderr)
            return 0
        return 1

    fetched: dict[str, dict] = {}
    failures: list[str] = []
    for index, symbol in enumerate(SYMBOLS):
        if index:
            time.sleep(0.8)
        try:
            fetched[symbol] = fetch_holdings(session, symbol, crumb_value)
        except Exception as exc:
            print(f"WARN {symbol}: {exc.__class__.__name__}: {exc}", file=sys.stderr)
            failures.append(symbol)

    payload = build_payload(previous, fetched)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    if args.static_out:
        static_path = Path(args.static_out)
        static_path.parent.mkdir(parents=True, exist_ok=True)
        static_path.write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )

    counts = {s: len(e.get("holdings") or []) for s, e in payload["etfs"].items()}
    print(f"wrote {out_path} ({len(payload['etfs'])} ETFs)")
    for symbol in SYMBOLS:
        print(f"  {symbol}: {counts.get(symbol, 0)} holdings")
    if failures:
        joined = ", ".join(failures)
        print(f"failures (kept previous data where possible): {joined}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
