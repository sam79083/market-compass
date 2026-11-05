from __future__ import annotations

from datetime import date, timedelta

import pandas as pd

from app.config import Settings
from app.ingestion.base import SeriesResult, make_frame
from app.ingestion.fetch import HttpClient

try:
    from feargreed.data import latest
except ImportError:
    latest = None


def fetch_free_fear_greed(settings: Settings, client: HttpClient) -> SeriesResult:
    """
    Fetch Fear & Greed from free public source.
    Uses the free FearGreedChart.com API when available.
    """
    # Try the official free API
    try:
        url = "https://feargreed.s3.us-east-2.amazonaws.com/latest.json"
        data = client.get_json(url)
        if isinstance(data, dict) and isinstance(data.get("values"), list) and len(data["values"]) >= 5:
            rows = []
            for item in data["values"][-180:]:
                val = item.get("value")
                d = item.get("date", "")
                if val is None or not d:
                    continue
                val = float(val)
                if val < 0 or val > 100:
                    continue
                dts = pd.to_datetime(d, errors="coerce")
                if pd.isna(dts):
                    continue
                rows.append({
                    "period_date": dts.date(),
                    "effective_date": dts.date(),
                    "value": val,
                    "is_estimate": False,
                    "source": "Fear & Greed Index (free source)",
                    "meta": {},
                })
            if rows:
                observations = make_frame(rows)
                return SeriesResult(
                    indicator_id="fear_greed",
                    status="ok",
                    observations=observations,
                    source="FearGreedChart.com (free)",
                    message=f"Loaded {len(observations)} Fear & Greed observations from free source",
                )
    except Exception:
        pass

    return SeriesResult(
        indicator_id="fear_greed",
        status="unavailable",
        observations=pd.DataFrame(columns=["period_date", "effective_date", "value", "is_estimate", "source", "meta"]),
        message=(
            "Fear & Greed data unavailable. "
            "The free source did not respond. "
            "To restore this indicator: "
            "1) Set FEAR_GREED_CSV_URL to a valid CSV URL (file:// or https://), or "
            "2) Import a CSV via `python -m app.cli import-csv --indicator fear_greed --file fear_greed.csv`"
        ),
        source="free",
    )
