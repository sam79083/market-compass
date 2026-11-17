from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from app.config import BACKEND_ROOT, Settings

logger = logging.getLogger(__name__)

REPO_ROOT = BACKEND_ROOT.parent
DEFAULT_PATH = REPO_ROOT / "data" / "etf_holdings.json"
SOURCE_LABEL = "Yahoo Finance topHoldings (unofficial)"


def _empty_payload() -> dict[str, Any]:
    return {"generated_at": None, "source": None, "etfs": {}}


def _holdings_path(settings: Settings) -> Path:
    raw = (settings.etf_holdings_json_url or "").strip()
    if not raw:
        return DEFAULT_PATH
    if raw.startswith("file://"):
        return Path(raw[len("file://") :])
    return Path(raw)


def _read_raw(settings: Settings) -> dict[str, Any]:
    raw = (settings.etf_holdings_json_url or "").strip()
    if raw.startswith(("http://", "https://")):
        import requests

        resp = requests.get(raw, timeout=30, headers={"User-Agent": settings.user_agent})
        resp.raise_for_status()
        payload = resp.json()
    else:
        path = _holdings_path(settings)
        payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("holdings payload is not a JSON object")
    return payload


def _sanitize_holding(item: Any) -> dict[str, Any] | None:
    if not isinstance(item, dict):
        return None
    name = item.get("name")
    if not isinstance(name, str) or not name.strip():
        return None
    try:
        weight = float(item.get("weight"))
    except (TypeError, ValueError):
        return None
    if not 0.0 <= weight <= 100.0:
        return None
    symbol = item.get("symbol")
    return {
        "symbol": str(symbol) if symbol else None,
        "name": name.strip(),
        "weight": round(weight, 2),
    }


def load_etf_holdings(settings: Settings) -> dict[str, Any]:
    """Top-10 holdings (percent of net assets) per tracked ETF, or an empty stub.

    The file is produced by scripts/fetch_etf_holdings.py and refreshed by the daily
    workflow. A missing or malformed file must never break the dashboard, so any
    failure falls back to an empty payload and the frontend shows a placeholder.
    """
    try:
        raw = _read_raw(settings)
    except Exception as exc:
        logger.warning("ETF holdings unavailable (%s: %s)", exc.__class__.__name__, exc)
        return _empty_payload()
    etfs_raw = raw.get("etfs")
    etfs: dict[str, Any] = {}
    if isinstance(etfs_raw, dict):
        for symbol, entry in etfs_raw.items():
            holdings = entry.get("holdings") if isinstance(entry, dict) else None
            cleaned = [h for h in (_sanitize_holding(item) for item in holdings or []) if h]
            if isinstance(symbol, str) and symbol.strip():
                etfs[symbol.strip().upper()] = {"holdings": cleaned}
    generated_at = raw.get("generated_at")
    return {
        "generated_at": str(generated_at) if generated_at else None,
        "source": str(raw.get("source") or SOURCE_LABEL),
        "etfs": etfs,
    }
