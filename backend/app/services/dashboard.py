from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.indicators import (
    CATEGORY_DESCRIPTIONS,
    CATEGORY_LABELS,
    CATEGORY_ORDER,
    INDICATORS,
    SECTION_LABELS,
    VALUATION_BANDS,
    classify_valuation,
    format_value,
)
from app.models import ComponentScore, CompositeScore, IngestRun, Observation
from app.scoring.composite import quality_flags, summarize_conditions, summarize_long_term
from app.scoring.explain import DISCLAIMER, build_explanation


def _latest_composite(session: Session) -> CompositeScore | None:
    return session.execute(
        select(CompositeScore).order_by(desc(CompositeScore.score_date)).limit(1)
    ).scalar_one_or_none()


def _latest_run(session: Session) -> IngestRun | None:
    return session.execute(select(IngestRun).order_by(desc(IngestRun.id)).limit(1)).scalar_one_or_none()


def _latest_component(session: Session, indicator_id: str) -> ComponentScore | None:
    return session.execute(
        select(ComponentScore)
        .where(ComponentScore.indicator_id == indicator_id)
        .order_by(desc(ComponentScore.score_date))
        .limit(1)
    ).scalar_one_or_none()


def _latest_observation(
    session: Session,
    indicator_id: str,
    include_estimates: bool,
    as_of: date | None = None,
) -> Observation | None:
    statement = select(Observation).where(Observation.indicator_id == indicator_id)
    if not include_estimates:
        statement = statement.where(Observation.is_estimate.is_(False))
    if as_of is not None:
        statement = statement.where(Observation.effective_date <= as_of)
    statement = statement.order_by(
        desc(Observation.period_date), desc(Observation.effective_date)
    ).limit(1)
    return session.execute(statement).scalar_one_or_none()


def _observation_payload(observation: Observation | None, indicator_id: str) -> dict | None:
    if observation is None:
        return None
    definition = INDICATORS[indicator_id]
    return {
        "date": observation.period_date.isoformat(),
        "effective_date": observation.effective_date.isoformat(),
        "value": observation.value,
        "display": format_value(observation.value, definition.value_kind, definition.unit),
        "is_estimate": observation.is_estimate,
        "source": observation.source,
        "meta": observation.meta or {},
    }


def _run_status_map(run: IngestRun | None) -> dict[str, dict]:
    if run is None:
        return {}
    mapping = {}
    for result in run.results or []:
        indicator_id = result.get("indicator_id")
        if indicator_id:
            mapping[str(indicator_id)] = result
    return mapping


def _score_payload(component: ComponentScore | None, as_of: date | None) -> dict | None:
    if component is None:
        return None
    return {
        "score_date": component.score_date.isoformat(),
        "score": component.score,
        "percentile": component.percentile,
        "raw_value": component.raw_value,
        "window_years_used": component.window_years_used,
        "observations_used": component.observations_used,
        "effective_date": component.effective_date.isoformat() if component.effective_date else None,
        "quality": component.quality,
        "meta": component.meta or {},
        "current": as_of is not None and component.score_date == as_of,
    }


def _sentiment(
    composite: CompositeScore | None,
    indicator_payloads: dict[str, dict],
) -> dict:
    fear_greed = indicator_payloads.get("fear_greed", {})
    if fear_greed.get("latest") and fear_greed.get("score") and fear_greed["score"].get("score") is not None:
        value = float(fear_greed["latest"]["value"])
        label = "Fear" if value <= 25 else "Greed" if value >= 75 else "Neutral"
        return {
            "available": True,
            "is_proxy": False,
            "value": round(value, 2),
            "label": label,
            "source": "CNN Fear & Greed",
            "note": "Authorized CNN feed.",
        }
    vix = indicator_payloads.get("vix", {})
    rsi = indicator_payloads.get("rsi", {})
    vix_score = (vix.get("score") or {}).get("score")
    rsi_score = (rsi.get("score") or {}).get("score")
    contributions = []
    if vix_score is not None:
        contributions.append(float(vix_score))
    if rsi_score is not None:
        contributions.append(100.0 - float(rsi_score))
    if not contributions:
        return {
            "available": False,
            "is_proxy": True,
            "value": None,
            "label": "Unavailable",
            "source": "VIX/RSI proxy",
            "note": "CNN Fear & Greed is not configured and VIX/RSI are unavailable.",
        }
    value = sum(contributions) / len(contributions)
    label = "Fear" if value <= 25 else "Greed" if value >= 75 else "Neutral"
    return {
        "available": True,
        "is_proxy": True,
        "value": round(value, 2),
        "label": label,
        "source": "VIX/RSI proxy",
        "note": (
            "CNN Fear & Greed is not configured. This labeled proxy averages the VIX percentile "
            "and the RSI percentile; it is not CNN data."
        ),
    }


def _trend(indicator_payloads: dict[str, dict]) -> dict:
    ma = indicator_payloads.get("ma200_deviation", {})
    latest = ma.get("scored") or ma.get("latest")
    if not latest:
        return {"available": False, "label": "Unavailable", "price": None, "ma200": None, "deviation_pct": None}
    meta = latest.get("meta") or {}
    price = meta.get("price")
    ma200 = meta.get("ma200")
    slope = meta.get("ma200_slope_20d")
    deviation = latest.get("value")
    if price is None or ma200 is None:
        return {"available": False, "label": "Unavailable", "price": price, "ma200": ma200, "deviation_pct": deviation}
    if deviation is None:
        deviation = (price / ma200 - 1.0) * 100.0
    if slope is None:
        label = "Bullish" if deviation > 0 else "Bearish" if deviation < 0 else "Neutral"
    elif deviation > 0 and slope > 0:
        label = "Bullish"
    elif deviation < 0 and slope < 0:
        label = "Bearish"
    else:
        label = "Neutral"
    return {
        "available": True,
        "label": label,
        "price": round(float(price), 2),
        "ma200": round(float(ma200), 2),
        "deviation_pct": round(float(deviation), 2),
        "slope_20d_pct": round(float(slope), 2) if slope is not None else None,
    }


def _indicator_payloads(
    session: Session,
    settings: Settings,
    composite: CompositeScore | None,
    run_status: dict[str, dict],
) -> dict[str, dict]:
    as_of = composite.score_date if composite else None
    today = date.today()
    payloads: dict[str, dict] = {}
    weights = settings.weights
    for indicator_id, definition in INDICATORS.items():
        published = _latest_observation(session, indicator_id, include_estimates=True)
        scored = _latest_observation(
            session, indicator_id, include_estimates=False, as_of=as_of
        )
        component = _latest_component(session, indicator_id)
        published_payload = _observation_payload(published, indicator_id)
        scored_payload = _observation_payload(scored, indicator_id)
        age_days = None
        pending = False
        if published is not None:
            age_days = (today - published.effective_date).days
            pending = published.effective_date > today
        stale = bool(age_days is not None and age_days > weights.staleness(indicator_id))
        result = run_status.get(indicator_id, {})
        run_state = result.get("status", "unknown")
        if published is None:
            status = "unavailable"
        elif stale:
            status = "stale"
        elif run_state == "error":
            status = "degraded"
        elif run_state == "skipped":
            status = "stored"
        elif component is None or component.score is None:
            status = "unscored"
        else:
            status = "fresh"
        if published_payload and published_payload["is_estimate"] and scored_payload:
            published_payload["scored_comparison"] = scored_payload
        payloads[indicator_id] = {
            "id": indicator_id,
            "name": definition.name,
            "short_name": definition.short_name,
            "description": definition.description,
            "section": definition.section,
            "section_label": SECTION_LABELS[definition.section],
            "category": definition.category,
            "category_label": CATEGORY_LABELS[definition.category],
            "unit": definition.unit,
            "value_kind": definition.value_kind,
            "frequency": definition.frequency,
            "source_name": definition.source_name,
            "source_url": definition.source_url,
            "methodology": definition.methodology,
            "limitations": definition.limitations,
            "order": definition.order,
            "weight": weights.weight_for(indicator_id),
            "supplementary": definition.supplementary or weights.weight_for(indicator_id) == 0,
            "optional": definition.optional,
            "unavailable_reason": definition.unavailable_reason,
            "chart_kind": definition.chart_kind,
            "thresholds": definition.thresholds,
            "status": status,
            "status_message": result.get("message", ""),
            "last_run_status": run_state,
            "pending_estimate": pending,
            "latest": published_payload,
            "scored": scored_payload,
            "score": _score_payload(component, as_of),
        }
    return payloads


def _category_payloads(
    composite: CompositeScore | None,
    weights,
) -> list[dict]:
    stored = composite.categories if composite else {}
    payloads = []
    for key in CATEGORY_ORDER:
        category = stored.get(key, {})
        payloads.append(
            {
                "key": key,
                "label": CATEGORY_LABELS[key],
                "description": CATEGORY_DESCRIPTIONS[key],
                "weight": float(weights.overall.get(key, 0.0)),
                "score": category.get("score"),
                "coverage": category.get("coverage", 0.0),
                "classification": category.get("classification", "Insufficient data"),
                "classification_key": category.get("classification_key", "unavailable"),
                "color": category.get("color", "#8b9aa8"),
                "components": category.get("components", {}),
            }
        )
    return payloads


def _freshness(
    payloads: dict[str, dict],
    composite: CompositeScore | None,
    run: IngestRun | None,
) -> dict:
    counts: dict[str, int] = {}
    for payload in payloads.values():
        counts[payload["status"]] = counts.get(payload["status"], 0) + 1
    available = sum(
        1 for payload in payloads.values() if payload["status"] not in {"unavailable"}
    )
    scored_dates = [
        payload["scored"]["date"]
        for payload in payloads.values()
        if payload.get("scored")
    ]
    return {
        "total": len(payloads),
        "available": available,
        "fresh": counts.get("fresh", 0),
        "stored": counts.get("stored", 0),
        "degraded": counts.get("degraded", 0),
        "stale": counts.get("stale", 0),
        "unscored": counts.get("unscored", 0),
        "unavailable": counts.get("unavailable", 0),
        "coverage": composite.coverage if composite else 0.0,
        "confidence": composite.confidence if composite else "low",
        "as_of": composite.score_date.isoformat() if composite else None,
        "latest_data": max(scored_dates) if scored_dates else None,
        "last_refresh": (
            (run.finished_at or run.started_at).isoformat() if run is not None else None
        ),
        "last_run_status": run.status if run is not None else "unknown",
        "last_run_message": run.message if run is not None else "",
    }


def build_dashboard(session: Session, settings: Settings) -> dict[str, Any]:
    composite = _latest_composite(session)
    run = _latest_run(session)
    run_status = _run_status_map(run)
    payloads = _indicator_payloads(session, settings, composite, run_status)
    weights = settings.weights
    categories = _category_payloads(composite, weights)
    stored_components = (composite.components or {}) if composite else {}
    stored_categories = (composite.categories or {}) if composite else {}
    explanation = (composite.explanation or {}) if composite else {}
    flag_list = sorted(set(explanation.get("quality_flags") or []))
    if not flag_list and stored_components:
        flag_list = quality_flags(stored_components, weights)
    long_term = explanation.get("long_term")
    conditions = explanation.get("conditions")
    if long_term is None and stored_categories:
        long_term = summarize_long_term(stored_categories, ["fundamental", "relative"], weights)
    if conditions is None and stored_categories:
        conditions = summarize_conditions(stored_categories, weights)
    if composite is not None:
        overall = {
            "score": composite.score,
            "classification": composite.classification,
            "classification_key": (
                classify_valuation(composite.score)["key"]
                if composite.score is not None
                else "unavailable"
            ),
            "color": (
                classify_valuation(composite.score)["color"]
                if composite.score is not None
                else "#8b9aa8"
            ),
            "coverage": composite.coverage,
            "confidence": composite.confidence,
            "quality_flags": flag_list,
            "long_term": long_term,
            "conditions": conditions,
        }
    else:
        overall = {
            "score": None,
            "classification": "Insufficient data",
            "classification_key": "unavailable",
            "color": "#8b9aa8",
            "coverage": 0.0,
            "confidence": "low",
            "quality_flags": [],
            "long_term": None,
            "conditions": None,
        }
    if not explanation and composite is not None:
        explanation = build_explanation(
            {
                "score": composite.score,
                "classification": composite.classification,
                "long_term": long_term,
                "conditions": conditions,
                "quality_flags": flag_list,
                "components": stored_components,
            }
        )
    explanation["long_term"] = long_term
    explanation["conditions"] = conditions
    explanation["quality_flags"] = flag_list


    freshness = _freshness(payloads, composite, run)
    latest_data = freshness.get("latest_data")
    summary = {
        "generated_at": datetime.now(UTC).isoformat(),
        "has_data": composite is not None or any(payload.get("latest") for payload in payloads.values()),
        "as_of": composite.score_date.isoformat() if composite else None,
        "latest_data": latest_data,
        "overall": overall,
        "categories": categories,
        "sentiment": _sentiment(composite, payloads),
        "trend": _trend(payloads),
        "explanation": explanation,
        "freshness": freshness,
        "indicators": [payloads[indicator_id] for indicator_id in INDICATORS],
        "bands": VALUATION_BANDS,
        "weights": weights.model_dump(mode="json"),
        "weights_hash": weights.hash,
        "disclaimer": DISCLAIMER,
        "last_run": (
            {
                "id": run.id,
                "status": run.status,
                "message": run.message,
                "started_at": run.started_at.isoformat() if run.started_at else None,
                "finished_at": run.finished_at.isoformat() if run.finished_at else None,
            }
            if run is not None
            else None
        ),
    }
    return summary

