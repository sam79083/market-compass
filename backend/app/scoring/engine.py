from __future__ import annotations

from datetime import date
from typing import Any

import pandas as pd
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.indicators import INDICATORS
from app.models import CategoryScore, ComponentScore, CompositeScore, Observation
from app.scoring.composite import compute_composite
from app.scoring.explain import build_explanation
from app.scoring.percentile import component_history, score_dates_from_prices

SCORED_INDICATORS = list(INDICATORS)
RAW_INDICATORS = [
    "sp500_price",
    "rsp",
    "spy",
    "treasury_10y",
    "earnings_yield",
    "forward_pe",
    "cpi",
]


def load_observations(session: Session) -> dict[str, pd.DataFrame]:
    rows = session.execute(select(Observation)).scalars().all()
    if not rows:
        return {}
    records = [
        {
            "indicator_id": row.indicator_id,
            "period_date": row.period_date,
            "effective_date": row.effective_date,
            "value": row.value,
            "is_estimate": row.is_estimate,
            "source": row.source,
            "meta": row.meta or {},
        }
        for row in rows
    ]
    frame = pd.DataFrame(records)
    result: dict[str, pd.DataFrame] = {}
    for indicator_id, group in frame.groupby("indicator_id"):
        result[str(indicator_id)] = group.sort_values("period_date").reset_index(drop=True)
    return result


def _score_dates(observations: dict[str, pd.DataFrame], settings: Settings) -> list[date]:
    price = observations.get("sp500_price")
    if price is not None and not price.empty:
        valid = price[~price["is_estimate"].fillna(False).astype(bool)]
        dates = sorted(pd.to_datetime(valid["period_date"]).dt.date.tolist())
        return score_dates_from_prices(dates, settings.score_start_year)
    start = pd.Timestamp(f"{settings.score_start_year}-01-01")
    end = pd.Timestamp(date.today())
    dates = pd.date_range(start=start, end=end, freq="BME").date.tolist()
    if dates and dates[-1] != date.today():
        dates.append(date.today())
    return dates


def _score_value_frame(indicator_id: str, frame: pd.DataFrame) -> tuple[pd.DataFrame, str | None]:
    if indicator_id != "ew_cw_relative":
        return frame, None
    working = frame.copy()
    working["score_value"] = working["meta"].apply(
        lambda meta: meta.get("rel_252d") if isinstance(meta, dict) else None
    )
    return working, "score_value"


def _quality_tags(indicator_id: str, frame: pd.DataFrame) -> tuple[str, ...]:
    tags: list[str] = []
    if indicator_id == "erp" and not frame.empty:
        latest = frame.sort_values("period_date").iloc[-1]
        meta = latest.get("meta") or {}
        if isinstance(meta, dict) and meta.get("method") == "trailing_proxy":
            tags.append("proxy")
    if indicator_id == "breadth_200dma":
        tags.append("survivorship")
    if indicator_id == "buffett":
        tags.append("supplementary")
    return tuple(tags)


def build_score_tables(
    observations: dict[str, pd.DataFrame],
    settings: Settings,
) -> tuple[pd.DataFrame, list[dict[str, Any]]]:
    weights = settings.weights
    score_dates = _score_dates(observations, settings)
    if not score_dates:
        return pd.DataFrame(), []

    component_frames: list[pd.DataFrame] = []
    for indicator_id, definition in INDICATORS.items():
        frame = observations.get(indicator_id)
        if frame is None or frame.empty:
            continue
        prepared, score_column = _score_value_frame(indicator_id, frame)
        history = component_history(
            prepared,
            indicator_id,
            definition.transform,
            score_dates,
            weights.window_years(indicator_id),
            weights.min_observations(indicator_id),
            weights.staleness(indicator_id),
            score_value_column=score_column,
            quality_tags=_quality_tags(indicator_id, prepared),
        )
        if not history.empty:
            component_frames.append(history)

    if not component_frames:
        return pd.DataFrame(), []
    components = pd.concat(component_frames, ignore_index=True)
    by_date: dict[date, dict[str, dict]] = {}
    for row in components.itertuples():
        by_date.setdefault(row.score_date, {})[row.indicator_id] = {
            "score": row.score,
            "percentile": row.percentile,
            "raw_value": row.raw_value,
            "effective_date": row.effective_date,
            "quality": row.quality,
            "window_years_used": row.window_years_used,
            "observations_used": row.observations_used,
            "meta": row.meta,
        }

    composite_rows: list[dict[str, Any]] = []
    for score_date in score_dates:
        date_components = by_date.get(score_date, {})
        composite = compute_composite(date_components, weights)
        composite["explanation"] = build_explanation(composite)
        composite["score_date"] = score_date
        composite_rows.append(composite)
    return components, composite_rows


def refresh_scores(session: Session, settings: Settings) -> dict[str, Any]:
    observations = load_observations(session)
    components, composite_rows = build_score_tables(observations, settings)
    session.execute(delete(ComponentScore))
    session.execute(delete(CategoryScore))
    session.execute(delete(CompositeScore))
    if not composite_rows:
        session.commit()
        return {"status": "empty", "score_dates": 0, "component_rows": 0}

    component_models = []
    for row in components.itertuples():
        component_models.append(
            ComponentScore(
                score_date=row.score_date,
                indicator_id=row.indicator_id,
                raw_value=float(row.raw_value) if pd.notna(row.raw_value) else None,
                percentile=float(row.percentile) if pd.notna(row.percentile) else None,
                score=float(row.score) if pd.notna(row.score) else None,
                window_years_used=(
                    float(row.window_years_used) if pd.notna(row.window_years_used) else None
                ),
                observations_used=(
                    int(row.observations_used) if pd.notna(row.observations_used) else None
                ),
                effective_date=row.effective_date,
                quality=row.quality,
                meta=row.meta,
            )
        )
    session.add_all(component_models)

    for composite in composite_rows:
        score_date = composite["score_date"]
        for category, payload in composite["categories"].items():
            session.add(
                CategoryScore(
                    score_date=score_date,
                    category=category,
                    score=payload.get("score"),
                    coverage=float(payload.get("coverage", 0.0)),
                    components=payload.get("components", {}),
                )
            )
        session.add(
            CompositeScore(
                score_date=score_date,
                score=composite.get("score"),
                classification=composite.get("classification", "unavailable"),
                coverage=float(composite.get("coverage", 0.0)),
                confidence=composite.get("confidence", "low"),
                categories=composite.get("categories", {}),
                components=composite.get("components", {}),
                explanation=composite.get("explanation", {}),
                weights_hash=composite.get("weights_hash", ""),
            )
        )
    session.commit()
    latest = composite_rows[-1]
    return {
        "status": "ok",
        "score_dates": len(composite_rows),
        "component_rows": len(component_models),
        "latest_date": latest["score_date"].isoformat(),
        "latest_score": latest.get("score"),
        "latest_coverage": latest.get("coverage"),
        "latest_confidence": latest.get("confidence"),
        "latest_classification": latest.get("classification"),
    }


