from __future__ import annotations

import json
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.indicators import INDICATORS
from app.models import CompositeScore
from app.scoring.composite import compute_composite
from app.scoring.engine import (
    _quality_tags,
    _score_value_frame,
    load_observations,
)
from app.scoring.percentile import component_history

HORIZONS = {"3m": 91, "1y": 365, "3y": 1095, "5y": 1825}
METRICS = ["composite", "cape", "forward_pe"]
RETURN_FIELDS = {
    "price": "price_return",
    "total_return": "spy_return",
    "real_price": "real_price_return",
    "real_total_return": "real_total_return",
}


def _series(frame: pd.DataFrame | None, value_column: str = "value") -> pd.Series:
    if frame is None or frame.empty:
        return pd.Series(dtype=float)
    working = frame.copy()
    working["date"] = pd.to_datetime(working["period_date"])
    working = working.dropna(subset=["date", value_column])
    return working.set_index("date")[value_column].sort_index().astype(float)


def _asof(series: pd.Series, target: pd.Timestamp, max_gap_days: int) -> float | None:
    if series.empty:
        return None
    index = series.index.searchsorted(target, side="right") - 1
    if index < 0:
        return None
    observed = series.index[index]
    if (target - observed).days > max_gap_days:
        return None
    return float(series.iloc[index])


def _spearman(x: pd.Series, y: pd.Series) -> float | None:
    if len(x) < 3 or len(y) < 3:
        return None
    rx = x.rank()
    ry = y.rank()
    value = rx.corr(ry)
    return float(value) if pd.notna(value) else None


def _return_stats(rows: pd.DataFrame, score_column: str, return_column: str) -> dict:
    subset = rows.dropna(subset=[score_column, return_column])
    if subset.empty:
        return {"n": 0, "mean": None, "median": None, "positive_rate": None, "spearman": None}
    returns = subset[return_column].astype(float)
    return {
        "n": int(len(subset)),
        "mean": round(float(returns.mean()), 6),
        "median": round(float(returns.median()), 6),
        "positive_rate": round(float((returns > 0).mean()), 4),
        "spearman": (
            round(_spearman(subset[score_column], returns), 4)
            if _spearman(subset[score_column], returns) is not None
            else None
        ),
    }


def _build_return_rows(
    composite_rows: list[CompositeScore],
    price: pd.Series,
    spy: pd.Series,
    cpi: pd.Series,
) -> pd.DataFrame:
    rows = []
    for row in composite_rows:
        if row.score is None:
            continue
        score_date = pd.Timestamp(row.score_date)
        start_price = _asof(price, score_date, 10)
        start_spy = _asof(spy, score_date, 10)
        start_cpi = _asof(cpi, score_date, 120)
        components = row.components or {}
        cape = (components.get("cape") or {}).get("score")
        forward_pe = (components.get("forward_pe") or {}).get("score")
        base = {
            "date": row.score_date,
            "score": float(row.score),
            "cape": float(cape) if cape is not None else np.nan,
            "forward_pe": float(forward_pe) if forward_pe is not None else np.nan,
            "classification": row.classification,
        }
        for horizon, days in HORIZONS.items():
            target = score_date + pd.Timedelta(days=days)
            end_price = _asof(price, target, 45)
            end_spy = _asof(spy, target, 45)
            end_cpi = _asof(cpi, target, 120)
            price_return = (
                end_price / start_price - 1.0
                if start_price and end_price and start_price > 0
                else np.nan
            )
            spy_return = (
                end_spy / start_spy - 1.0
                if start_spy and end_spy and start_spy > 0
                else np.nan
            )
            inflation = (
                end_cpi / start_cpi - 1.0
                if start_cpi and end_cpi and start_cpi > 0
                else np.nan
            )
            real_price = (
                (1.0 + price_return) / (1.0 + inflation) - 1.0
                if pd.notna(price_return) and pd.notna(inflation)
                else np.nan
            )
            real_total = (
                (1.0 + spy_return) / (1.0 + inflation) - 1.0
                if pd.notna(spy_return) and pd.notna(inflation)
                else np.nan
            )
            rows.append(
                {
                    **base,
                    "horizon": horizon,
                    "price_return": price_return,
                    "spy_return": spy_return,
                    "real_price_return": real_price,
                    "real_total_return": real_total,
                }
            )
    return pd.DataFrame(rows)


def _horizon_payload(rows: pd.DataFrame) -> dict:
    payload = {}
    for metric in METRICS:
        score_column = "score" if metric == "composite" else metric
        metric_payload = {}
        for label, field in RETURN_FIELDS.items():
            metric_payload[label] = _return_stats(rows, score_column, field)
        payload[metric] = metric_payload
    by_classification = []
    for classification, group in rows.groupby("classification", dropna=True):
        subset = group.dropna(subset=["price_return"])
        if subset.empty:
            continue
        by_classification.append(
            {
                "classification": classification,
                "n": int(len(subset)),
                "mean_price_return": round(float(subset["price_return"].mean()), 6),
                "median_price_return": round(float(subset["price_return"].median()), 6),
                "positive_rate": round(float((subset["price_return"] > 0).mean()), 4),
            }
        )
    payload["by_classification"] = by_classification
    return payload


def _correlations(composite_rows: list[CompositeScore]) -> dict:
    records = []
    for row in composite_rows:
        if row.score is None:
            continue
        record = {"date": row.score_date}
        for indicator_id, component in (row.components or {}).items():
            if isinstance(component, dict) and component.get("available"):
                record[indicator_id] = component.get("score")
        records.append(record)
    frame = pd.DataFrame(records)
    if frame.empty:
        return {"pearson": {}, "spearman": {}, "n": 0}
    frame = frame.drop(columns=["date"]).dropna(axis=1, how="all")
    available = [column for column in frame.columns if frame[column].notna().sum() >= 12]
    frame = frame[available]
    return {
        "n": int(len(frame)),
        "pearson": frame.corr(method="pearson").round(4).to_dict(),
        "spearman": frame.rank().corr().round(4).to_dict(),
    }


def _window_sensitivity(
    observations: dict[str, pd.DataFrame],
    settings: Settings,
    latest_date: date,
) -> dict:
    weights = settings.weights
    payload = {}
    for years in [10, 15, 20, 30]:
        components = {}
        for indicator_id, definition in INDICATORS.items():
            frame = observations.get(indicator_id)
            if frame is None or frame.empty:
                continue
            prepared, score_column = _score_value_frame(indicator_id, frame)
            history = component_history(
                prepared,
                indicator_id,
                definition.transform,
                [latest_date],
                years,
                weights.min_observations(indicator_id),
                weights.staleness(indicator_id),
                score_value_column=score_column,
                quality_tags=_quality_tags(indicator_id, prepared),
            )
            if not history.empty:
                row = history.iloc[0]
                components[indicator_id] = {
                    "score": row["score"],
                    "percentile": row["percentile"],
                    "raw_value": row["raw_value"],
                    "effective_date": row["effective_date"],
                    "quality": row["quality"],
                    "window_years_used": row["window_years_used"],
                    "observations_used": row["observations_used"],
                    "meta": row["meta"],
                }
        composite = compute_composite(components, weights)
        payload[str(years)] = {
            "score": composite["score"],
            "coverage": composite["coverage"],
            "classification": composite["classification"],
            "categories": {
                key: {"score": value.get("score"), "coverage": value.get("coverage")}
                for key, value in composite["categories"].items()
            },
        }
    return {"latest_date": latest_date.isoformat(), "windows": payload}


def compute_validation(session: Session, settings: Settings) -> dict[str, Any]:
    composite_rows = (
        session.execute(select(CompositeScore).order_by(CompositeScore.score_date))
        .scalars()
        .all()
    )
    scored_rows = [row for row in composite_rows if row.score is not None]
    observations = load_observations(session)
    price = _series(observations.get("sp500_price"))
    spy = _series(observations.get("spy"))
    cpi = _series(observations.get("cpi"))
    returns = _build_return_rows(scored_rows, price, spy, cpi)

    horizons = {}
    for horizon in HORIZONS:
        subset = returns[returns["horizon"] == horizon] if not returns.empty else returns
        horizons[horizon] = _horizon_payload(subset) if not subset.empty else {}

    out_of_sample = {}
    if not returns.empty:
        for label, mask in [
            ("pre_2015", pd.to_datetime(returns["date"]) < pd.Timestamp("2015-01-01")),
            ("post_2015", pd.to_datetime(returns["date"]) >= pd.Timestamp("2015-01-01")),
        ]:
            subset = returns[mask]
            out_of_sample[label] = {
                horizon: _horizon_payload(subset[subset["horizon"] == horizon])
                if not subset[subset["horizon"] == horizon].empty
                else {}
                for horizon in HORIZONS
            }

    latest_date = scored_rows[-1].score_date if scored_rows else date.today()
    payload = {
        "generated_at": datetime.now(UTC).isoformat(),
        "weights_hash": settings.weights.hash,
        "start": scored_rows[0].score_date.isoformat() if scored_rows else None,
        "end": scored_rows[-1].score_date.isoformat() if scored_rows else None,
        "n_scores": len(scored_rows),
        "horizons": horizons,
        "out_of_sample": out_of_sample,
        "correlations": _correlations(composite_rows),
        "window_sensitivity": _window_sensitivity(observations, settings, latest_date),
        "limitations": [
            "Historical data are current-vintage; revisions and vintage effects are not captured.",
            "Forward returns overlap heavily, so effective sample sizes are much smaller than the raw counts.",
            "The 5-year horizon has no observations for the most recent five years.",
            "Total-return results rely on SPY adjusted closes and begin in 2003; earlier results are price-only.",
            "Market breadth uses current constituents and is survivorship-biased.",
            "Forward P/E is absent unless a licensed feed is configured, so the fundamental category and its baseline may be unavailable.",
            "Weights are explicit assumptions, not statistically optimized parameters. No out-of-sample weight fitting was performed.",
            "Returns exclude taxes, transaction costs, and implementation shortfall. The composite is not a trading strategy.",
        ],
    }
    return payload


def write_validation(payload: dict, settings: Settings) -> Path:
    path = Path(settings.validation_output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path
