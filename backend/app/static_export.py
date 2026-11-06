from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.config import Settings
from app.indicators import INDICATORS, INDICATORS_NASDAQ
from app.scoring.engine import INDEX_KEYS
from app.services.dashboard import build_dashboard
from app.services.history import (
    get_composite_history,
    get_indicator_history,
    get_methodology,
)


def _write_json(path: Path, payload: Any) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), default=str)
    path.write_text(f"{text}\n", encoding="utf-8")
    return len(text.encode("utf-8"))


def _validation_payload(settings: Settings) -> dict[str, Any] | None:
    path = Path(settings.validation_output_path)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def export_static(session: Session, settings: Settings, out_dir: Path) -> dict[str, Any]:
    out = Path(out_dir)
    files: dict[str, int] = {}

    # The static frontend requests dashboard.<index>.json for each index it can show.
    # dashboard.json (the S&P 500 view) is kept for older clients and the API default.
    for index in INDEX_KEYS:
        name = f"dashboard.{index}.json"
        files[name] = _write_json(out / name, build_dashboard(session, settings, index))
    files["dashboard.json"] = _write_json(
        out / "dashboard.json", build_dashboard(session, settings, "sp500")
    )
    files["composite-history.json"] = _write_json(
        out / "composite-history.json",
        get_composite_history(session, settings, "max"),
    )
    files["composite-history.nasdaq.json"] = _write_json(
        out / "composite-history.nasdaq.json",
        get_composite_history(session, settings, "max", "nasdaq"),
    )
    files["methodology.json"] = _write_json(
        out / "methodology.json",
        get_methodology(settings),
    )

    for indicator_id in INDICATORS:
        payload = get_indicator_history(session, settings, indicator_id, "max")
        files[f"indicators/{indicator_id}.json"] = _write_json(
            out / "indicators" / f"{indicator_id}.json",
            payload,
        )
    # NASDAQ history lives in its own folder so the S&P 500 layout is unchanged.
    for indicator_id in INDICATORS_NASDAQ:
        payload = get_indicator_history(session, settings, indicator_id, "max", "nasdaq")
        files[f"indicators/nasdaq/{indicator_id}.json"] = _write_json(
            out / "indicators" / "nasdaq" / f"{indicator_id}.json",
            payload,
        )

    validation = _validation_payload(settings)
    if validation is not None:
        files["validation.json"] = _write_json(out / "validation.json", validation)

    return {
        "status": "ok",
        "output": str(out),
        "files": len(files),
        "bytes": sum(files.values()),
    }
