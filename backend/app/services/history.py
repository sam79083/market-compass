from __future__ import annotations

import json
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.indicators import (
    CATEGORY_DESCRIPTIONS,
    CATEGORY_LABELS,
    CATEGORY_ORDER,
    INDICATORS,
    VALUATION_BANDS,
    format_value,
    series_id_for,
)
from app.models import CompositeScore, Observation
from app.scoring.engine import indicators_for
from app.scoring.explain import DATA_NOTES, DISCLAIMER
from app.services.index_scores import score_source

RANGE_YEARS = {"1y": 1, "3y": 3, "5y": 5, "10y": 10, "max": None}

DATA_SOURCES = [
    {
        "id": "shiller",
        "name": "Robert Shiller / shillerdata.com",
        "url": "https://shillerdata.com/",
        "used_for": ["CAPE", "trailing earnings yield", "CPI"],
        "frequency": "Monthly",
        "limitations": "Current-vintage history; revisions are not captured. Newest month is preliminary.",
    },
    {
        "id": "cboe",
        "name": "Cboe Global Markets",
        "url": "https://www.cboe.com/",
        "used_for": ["VIX"],
        "frequency": "Daily",
        "limitations": "VIX measures implied volatility, not valuation.",
    },
    {
        "id": "treasury",
        "name": "U.S. Department of the Treasury",
        "url": "https://home.treasury.gov/resource-center/data-chart-center/interest-rates",
        "used_for": ["10-year Treasury yield", "ERP proxy"],
        "frequency": "Daily",
        "limitations": "Nominal yield; the ERP fallback is an earnings-yield proxy.",
    },
    {
        "id": "worldbank",
        "name": "World Bank / World Federation of Exchanges",
        "url": "https://data.worldbank.org/indicator/CM.MKT.LCAP.GD.ZS",
        "used_for": ["Buffett Indicator"],
        "frequency": "Annual",
        "limitations": "Annual, lagged, listed domestic companies only; supplementary evidence.",
    },
    {
        "id": "prices",
        "name": "Yahoo Finance chart interface (unofficial)",
        "url": "https://finance.yahoo.com/",
        "used_for": ["S&P 500 price", "RSP/SPY total-return proxy", "breadth constituent prices"],
        "frequency": "Daily",
        "limitations": (
            "Unofficial interface; review the provider's terms before public or commercial use. "
            "A licensed price feed can be substituted."
        ),
    },
    {
        "id": "constituents",
        "name": "S&P 500 constituents dataset",
        "url": "https://github.com/datasets/s-and-p-500-companies",
        "used_for": ["Market breadth"],
        "frequency": "Snapshot",
        "limitations": "Current membership only; breadth history is survivorship-biased.",
    },
    {
        "id": "forward_pe",
        "name": "FactSet Earnings Insight (weekly report)",
        "url": "https://insight.factset.com/",
        "used_for": ["Forward P/E", "Forward ERP"],
        "frequency": "Weekly",
        "limitations": "Parsed from a weekly PDF report, rounded to one decimal. History starts at the first fetched report unless backfilled.",
    },
    {
        "id": "fear_greed",
        "name": "Authorized CNN Fear & Greed feed",
        "url": "https://www.cnn.com/markets/fear-and-greed",
        "used_for": ["CNN Fear & Greed Index"],
        "frequency": "Vendor-defined",
        "limitations": "Not bundled. Requires an authorized feed; no proxy is labeled as CNN data.",
    },
]

SCORE_METHOD = (
    "Each indicator is converted to a 0-100 component score. Higher scores mean more attractive "
    "or more supportive conditions. Valuation indicators use 100 - historical percentile; ERP, "
    "trend, and breadth use the historical percentile directly; Fear & Greed uses 100 - index. "
    "Percentiles are computed point-in-time over a rolling 20-year window (or the longest reliable "
    "window, disclosed on each component). Components are combined within categories, then "
    "categories are combined using the configured weights. Missing components are renormalized "
    "within their category; coverage is reported. The composite is withheld if coverage is below "
    "the configured minimum."
)


def _filter_start(latest: date | None, range_key: str) -> date | None:
    years = RANGE_YEARS.get(range_key, None)
    if latest is None or years is None:
        return None
    return latest - timedelta(days=round(years * 365.25))


def _observation_point(row: Observation, indicator_id: str, definition) -> dict:
    point = {
        "date": row.period_date.isoformat(),
        "effective_date": row.effective_date.isoformat(),
        "value": row.value,
        "display": format_value(row.value, definition.value_kind, definition.unit),
        "is_estimate": row.is_estimate,
        "source": row.source,
    }
    meta = row.meta or {}
    if indicator_id == "ma200_deviation":
        point["price"] = meta.get("price")
        point["ma200"] = meta.get("ma200")
        point["ma200_slope_20d"] = meta.get("ma200_slope_20d")
    elif indicator_id == "ew_cw_relative":
        point["rsp_norm"] = meta.get("rsp_norm")
        point["spy_norm"] = meta.get("spy_norm")
        point["rel_252d"] = meta.get("rel_252d")
    elif indicator_id == "erp":
        point["earnings_yield"] = meta.get("earnings_yield")
        point["treasury_yield"] = meta.get("treasury_yield")
        point["method"] = meta.get("method")
        point["earnings_effective_date"] = meta.get("earnings_effective_date")
    elif indicator_id == "breadth_200dma":
        point["above"] = meta.get("above")
        point["constituents"] = meta.get("constituents")
    return point


def get_indicator_history(
    session: Session,
    settings: Settings,
    indicator_id: str,
    range_key: str = "max",
    index: str = "sp500",
) -> dict[str, Any]:
    definitions = indicators_for(index)
    if indicator_id not in definitions:
        raise KeyError(indicator_id)
    definition = definitions[indicator_id]
    series_id = series_id_for(definition)
    rows = (
        session.execute(
            select(Observation)
            .where(Observation.indicator_id == series_id)
            .order_by(Observation.period_date, Observation.effective_date)
        )
        .scalars()
        .all()
        if series_id
        else []
    )
    latest_date = rows[-1].period_date if rows else None
    start = _filter_start(latest_date, range_key)
    filtered = [row for row in rows if start is None or row.period_date >= start]
    points = [_observation_point(row, indicator_id, definition) for row in filtered]
    return {
        "indicator": {
            "id": definition.id,
            "name": definition.name,
            "short_name": definition.short_name,
            "description": definition.description,
            "unit": definition.unit,
            "value_kind": definition.value_kind,
            "frequency": definition.frequency,
            "source_name": definition.source_name,
            "source_url": definition.source_url,
            "methodology": definition.methodology,
            "limitations": definition.limitations,
            "chart_kind": definition.chart_kind,
            "thresholds": definition.thresholds,
            "optional": definition.optional,
        },
        "range": range_key,
        "available_from": rows[0].period_date.isoformat() if rows else None,
        "available_to": latest_date.isoformat() if latest_date else None,
        "points": points,
    }


def get_composite_history(
    session: Session,
    settings: Settings,
    range_key: str = "max",
    index: str = "sp500",
) -> dict[str, Any]:
    rows = score_source(session, settings, index).composites()
    scored = [row for row in rows if row.score is not None]
    latest_date = scored[-1].score_date if scored else (rows[-1].score_date if rows else None)
    start = _filter_start(latest_date, range_key)
    filtered = [row for row in scored if start is None or row.score_date >= start]
    points = []
    for row in filtered:
        components = {}
        for indicator_id, component in (row.components or {}).items():
            if not isinstance(component, dict):
                continue
            components[indicator_id] = {
                "score": component.get("score"),
                "percentile": component.get("percentile"),
                "available": component.get("available"),
                "weight": component.get("weight"),
            }
        categories = {}
        for category, payload in (row.categories or {}).items():
            if isinstance(payload, dict):
                categories[category] = {
                    "score": payload.get("score"),
                    "coverage": payload.get("coverage"),
                }
        points.append(
            {
                "date": row.score_date.isoformat(),
                "score": row.score,
                "classification": row.classification,
                "coverage": row.coverage,
                "confidence": row.confidence,
                "components": components,
                "categories": categories,
            }
        )
    return {
        "range": range_key,
        "available_from": rows[0].score_date.isoformat() if rows else None,
        "available_to": latest_date.isoformat() if latest_date else None,
        "reference_line": 50,
        "bands": VALUATION_BANDS,
        "weights_hash": settings.weights.for_index(index).hash,
        "points": points,
    }


def _load_validation(settings: Settings) -> dict | None:
    path = Path(settings.validation_output_path)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def get_methodology(settings: Settings) -> dict[str, Any]:
    weights = settings.weights
    indicator_payloads = []
    for definition in sorted(INDICATORS.values(), key=lambda item: item.order):
        indicator_payloads.append(
            {
                "id": definition.id,
                "name": definition.name,
                "short_name": definition.short_name,
                "description": definition.description,
                "section": definition.section,
                "category": definition.category,
                "unit": definition.unit,
                "frequency": definition.frequency,
                "source_name": definition.source_name,
                "source_url": definition.source_url,
                "methodology": definition.methodology,
                "limitations": definition.limitations,
                "weight": weights.weight_for(definition.id),
                "supplementary": definition.supplementary or weights.weight_for(definition.id) == 0,
                "optional": definition.optional,
                "unavailable_reason": definition.unavailable_reason,
                "transform": definition.transform,
                "window_years": weights.window_years(definition.id),
                "minimum_observations": weights.min_observations(definition.id),
                "staleness_days": weights.staleness(definition.id),
                "availability_lag_days": weights.availability_lag(definition.id),
            }
        )
    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "weights": weights.model_dump(mode="json"),
        "weights_hash": weights.hash,
        "score_method": SCORE_METHOD,
        "categories": [
            {
                "key": key,
                "label": CATEGORY_LABELS[key],
                "description": CATEGORY_DESCRIPTIONS[key],
                "weight": weights.overall.get(key, 0.0),
            }
            for key in CATEGORY_ORDER
        ],
        "bands": VALUATION_BANDS,
        "indicators": indicator_payloads,
        "sources": DATA_SOURCES,
        "quality_notes": DATA_NOTES,
        "validation": _load_validation(settings),
        "disclaimer": DISCLAIMER,
    }


def get_health(session: Session) -> dict[str, Any]:
    latest = session.execute(
        select(CompositeScore).order_by(desc(CompositeScore.score_date)).limit(1)
    ).scalar_one_or_none()
    return {
        "status": "ok",
        "latest_score_date": latest.score_date.isoformat() if latest else None,
        "latest_score": latest.score if latest else None,
        "checked_at": datetime.now(UTC).isoformat(),
    }
