from __future__ import annotations

from datetime import date

import pytest

from app.config import load_weights
from app.indicators import INDICATORS
from app.scoring.composite import (
    compute_categories,
    compute_composite,
    quality_flags,
    summarize_conditions,
    summarize_long_term,
)


def _component(score=80.0, quality="ok", percentile=50.0):
    return {
        "score": score,
        "percentile": percentile,
        "raw_value": 1.0,
        "effective_date": date(2024, 1, 31),
        "window_years_used": 20.0,
        "observations_used": 100,
        "quality": quality,
    }


def _all_components(score=80.0, include_forward=True):
    components = {indicator_id: _component(score) for indicator_id in INDICATORS}
    if not include_forward:
        components["forward_pe"] = None
    components["erp"] = _component(score, quality="proxy")
    components["breadth_200dma"] = _component(score, quality="survivorship")
    return components


def test_category_renormalizes_missing_component():
    weights = load_weights()
    components = _all_components(score=80.0, include_forward=False)
    categories = compute_categories(components, weights)
    fundamental = categories["fundamental"]
    assert fundamental["score"] == pytest.approx(80.0)
    assert fundamental["coverage"] == pytest.approx(0.6)
    assert fundamental["components"]["forward_pe"]["available"] is False
    assert fundamental["components"]["buffett"]["supplementary"] is True


def test_category_weighted_average():
    weights = load_weights()
    components = _all_components(score=60.0)
    components["forward_pe"] = _component(100.0)
    categories = compute_categories(components, weights)
    assert categories["fundamental"]["score"] == pytest.approx(0.6 * 60 + 0.4 * 100)
    assert categories["fundamental"]["coverage"] == pytest.approx(1.0)


def test_composite_requires_minimum_categories_and_coverage():
    weights = load_weights()
    only_sentiment = {
        indicator_id: _component() if INDICATORS[indicator_id].category == "sentiment" else None
        for indicator_id in INDICATORS
    }
    result = compute_composite(only_sentiment, weights)
    assert result["score"] is None
    assert result["classification"] == "Insufficient data"
    assert result["coverage"] == pytest.approx(0.2)
    assert result["confidence"] == "low"


def test_composite_scores_when_coverage_is_sufficient():
    weights = load_weights()
    components = {
        indicator_id: (_component(80.0) if INDICATORS[indicator_id].category != "breadth" else None)
        for indicator_id in INDICATORS
    }
    components["forward_pe"] = None
    result = compute_composite(components, weights)
    assert result["score"] == pytest.approx(80.0)
    assert result["classification"] == "Very Undervalued"
    assert result["coverage"] == pytest.approx(0.7)
    assert result["confidence"] == "medium"
    assert "forward_pe_unavailable" in result["quality_flags"]


def test_full_coverage_has_high_confidence():
    weights = load_weights()
    components = _all_components(score=45.0)
    components["erp"] = _component(45.0, quality="ok")
    components["breadth_200dma"] = _component(45.0, quality="ok")
    result = compute_composite(components, weights)
    assert result["coverage"] == pytest.approx(1.0)
    assert result["confidence"] == "high"
    assert result["quality_flags"] == ["buffett_supplementary"]


def test_quality_flags_report_known_limitations():
    weights = load_weights()
    components = _all_components(score=50.0, include_forward=False)
    flags = quality_flags(components, weights)
    assert "buffett_supplementary" in flags
    assert "forward_pe_unavailable" in flags
    assert "erp_proxy" in flags
    assert "breadth_survivorship" in flags


def test_long_term_and_conditions_summaries():
    weights = load_weights()
    components = _all_components(score=80.0, include_forward=False)
    categories = compute_categories(components, weights)
    long_term = summarize_long_term(categories, ["fundamental", "relative"], weights)
    conditions = summarize_conditions(categories, weights)
    assert long_term["score"] == pytest.approx(80.0)
    assert long_term["coverage"] == pytest.approx((0.5 * 0.6 + 0.2) / 0.7, rel=1e-4)
    assert long_term["label"] == "Very Undervalued"
    assert conditions["score"] == pytest.approx(80.0)
    assert conditions["label"] == "Supportive"
