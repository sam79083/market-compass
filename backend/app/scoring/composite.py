from __future__ import annotations

from app.config import WeightsFile
from app.indicators import (
    CATEGORY_LABELS,
    CATEGORY_ORDER,
    INDICATORS,
    classify_conditions,
    classify_valuation,
)


def _component_view(indicator_id: str, component: dict | None, weight: float) -> dict:
    definition = INDICATORS[indicator_id]
    available = bool(component and component.get("score") is not None)
    return {
        "id": indicator_id,
        "name": definition.name,
        "short_name": definition.short_name,
        "category": definition.category,
        "weight": weight,
        "available": available,
        "supplementary": definition.supplementary or weight == 0,
        "score": round(float(component["score"]), 2) if available else None,
        "percentile": (
            round(float(component["percentile"]), 2)
            if available and component.get("percentile") is not None
            else None
        ),
        "raw_value": float(component["raw_value"]) if available else None,
        "effective_date": (
            component["effective_date"].isoformat()
            if available and component.get("effective_date") is not None
            else None
        ),
        "window_years_used": (
            float(component["window_years_used"])
            if available and component.get("window_years_used") is not None
            else None
        ),
        "observations_used": (
            int(component["observations_used"])
            if available and component.get("observations_used") is not None
            else None
        ),
        "quality": component.get("quality", "unavailable") if available else "unavailable",
    }


def compute_categories(components: dict[str, dict | None], weights: WeightsFile) -> dict[str, dict]:
    results: dict[str, dict] = {}
    for category in CATEGORY_ORDER:
        mapping = weights.category_maps[category]
        views = {}
        weighted_scores = 0.0
        available_weight = 0.0
        configured_weight = sum(float(weight) for weight in mapping.values())
        for indicator_id, weight in mapping.items():
            view = _component_view(indicator_id, components.get(indicator_id), float(weight))
            views[indicator_id] = view
            if view["available"] and weight > 0:
                weighted_scores += weight * float(view["score"])
                available_weight += weight
        if available_weight > 0:
            score = weighted_scores / available_weight
            coverage = available_weight / configured_weight if configured_weight else 0.0
        else:
            score = None
            coverage = 0.0
        if category in {"fundamental", "relative"}:
            classification = classify_valuation(score)
        else:
            classification = classify_conditions(score)
        results[category] = {
            "key": category,
            "label": CATEGORY_LABELS[category],
            "score": round(score, 2) if score is not None else None,
            "coverage": round(coverage, 4),
            "weight": float(weights.overall.get(category, 0.0)),
            "classification": classification["label"],
            "classification_key": classification["key"],
            "color": classification["color"],
            "components": views,
        }
    return results


def summarize_long_term(categories: dict[str, dict], keys: list[str], weights: WeightsFile) -> dict:
    available = [
        key
        for key in keys
        if categories.get(key, {}).get("score") is not None
    ]
    if not available:
        return {"score": None, "label": "Insufficient data", "coverage": 0.0, "color": "#8b9aa8"}
    total_weight = sum(weights.overall.get(key, 0.0) for key in available)
    if total_weight <= 0:
        return {"score": None, "label": "Insufficient data", "coverage": 0.0, "color": "#8b9aa8"}
    score = sum(weights.overall[key] * categories[key]["score"] for key in available) / total_weight
    coverage = sum(weights.overall[key] * categories[key]["coverage"] for key in available) / total_weight
    return {
        "score": round(score, 2),
        "label": classify_valuation(score)["label"],
        "coverage": round(coverage, 4),
        "color": classify_valuation(score)["color"],
    }


def summarize_conditions(categories: dict[str, dict], weights: WeightsFile) -> dict:
    keys = ["sentiment", "breadth"]
    available = [key for key in keys if categories.get(key, {}).get("score") is not None]
    if not available:
        return {"score": None, "label": "Insufficient data", "coverage": 0.0, "color": "#8b9aa8"}
    total_weight = sum(weights.overall.get(key, 0.0) for key in available)
    score = sum(weights.overall[key] * categories[key]["score"] for key in available) / total_weight
    coverage = sum(weights.overall[key] * categories[key]["coverage"] for key in available) / total_weight
    classification = classify_conditions(score)
    return {
        "score": round(score, 2),
        "label": classification["label"],
        "coverage": round(coverage, 4),
        "color": classification["color"],
    }


def quality_flags(components: dict[str, dict | None], weights: WeightsFile) -> list[str]:
    flags: set[str] = set()
    for indicator_id, definition in INDICATORS.items():
        component = components.get(indicator_id)
        weight = weights.weight_for(indicator_id)
        if definition.supplementary or weight == 0:
            flags.add("buffett_supplementary")
            continue
        if not component or component.get("score") is None:
            flags.add(f"{indicator_id}_unavailable")
            continue
        quality = str(component.get("quality", ""))
        if "proxy" in quality:
            flags.add("erp_proxy")
        if "survivorship" in quality:
            flags.add("breadth_survivorship")
        if "short_window" in quality:
            flags.add("short_percentile_window")
        if "direct_scale" in quality:
            flags.add("direct_scale_component")
    return sorted(flags)


def compute_composite(components: dict[str, dict | None], weights: WeightsFile) -> dict:
    categories = compute_categories(components, weights)
    available_categories = [
        key for key in CATEGORY_ORDER if categories.get(key, {}).get("score") is not None
    ]
    configured_overall = sum(float(value) for value in weights.overall.values())
    coverage = sum(
        float(weights.overall.get(key, 0.0)) * float(categories[key]["coverage"])
        for key in CATEGORY_ORDER
    ) / configured_overall
    flags = quality_flags(components, weights)

    score = None
    if (
        len(available_categories) >= weights.minimum_categories
        and coverage >= weights.minimum_coverage
    ):
        total_weight = sum(float(weights.overall[key]) for key in available_categories)
        score = (
            sum(float(weights.overall[key]) * float(categories[key]["score"]) for key in available_categories)
            / total_weight
        )
    classification = classify_valuation(score)
    gating_flags = [
        flag for flag in flags if flag not in {"buffett_supplementary", "direct_scale_component"}
    ]
    if score is None:
        confidence = "low"
    elif coverage >= 0.9 and not gating_flags:
        confidence = "high"
    elif coverage >= 0.7:
        confidence = "medium"
    else:
        confidence = "low"

    long_term = summarize_long_term(categories, ["fundamental", "relative"], weights)
    conditions = summarize_conditions(categories, weights)
    views = {
        indicator_id: _component_view(indicator_id, components.get(indicator_id), weights.weight_for(indicator_id))
        for indicator_id in INDICATORS
    }
    return {
        "score": round(score, 2) if score is not None else None,
        "classification": classification["label"],
        "classification_key": classification["key"],
        "classification_color": classification["color"],
        "coverage": round(coverage, 4),
        "confidence": confidence,
        "quality_flags": flags,
        "available_categories": available_categories,
        "categories": categories,
        "components": views,
        "long_term": long_term,
        "conditions": conditions,
        "weights_hash": weights.hash,
    }

