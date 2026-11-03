from __future__ import annotations

from datetime import date, timedelta

from app.config import Settings
from app.ingestion.base import SeriesResult, SourceError, make_frame
from app.ingestion.fetch import HttpClient


def fetch_buffett(settings: Settings, client: HttpClient) -> SeriesResult:
    try:
        payload = client.get_json(
            settings.worldbank_url,
            params={"format": "json", "per_page": 100},
        )
    except Exception as exc:
        raise SourceError(f"could not load World Bank market-cap/GDP data: {exc}") from exc

    if not isinstance(payload, list) or len(payload) < 2 or not payload[1]:
        raise SourceError("World Bank response did not contain observations")

    lag = settings.weights.availability_lag("buffett")
    current_year = date.today().year
    rows = []
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
        rows.append(
            {
                "period_date": period,
                "effective_date": period + timedelta(days=lag),
                "value": numeric,
                "is_estimate": year >= current_year - 1,
                "source": "World Bank / World Federation of Exchanges",
                "meta": {
                    "market_cap_definition": "listed domestic companies",
                    "gdp_definition": "nominal GDP",
                },
            }
        )

    observations = make_frame(rows)
    if observations.empty:
        raise SourceError("World Bank market-cap/GDP data returned no usable observations")
    return SeriesResult(
        indicator_id="buffett",
        status="ok",
        observations=observations,
        source="World Bank / World Federation of Exchanges",
        message=f"Loaded {len(observations)} annual market-cap/GDP observations",
    )
