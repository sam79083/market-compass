from __future__ import annotations

import pytest

from app.config import load_weights
from app.indicators import (
    CATEGORY_ORDER,
    INDICATORS,
    classify_conditions,
    classify_valuation,
    format_value,
)


def test_weights_cover_every_indicator():
    weights = load_weights()
    assert set(weights.overall) == set(CATEGORY_ORDER)
    assert weights.hash
    for indicator_id in INDICATORS:
        assert weights.weight_for(indicator_id) >= 0
        assert weights.staleness(indicator_id) >= 0
        assert weights.availability_lag(indicator_id) >= 0


@pytest.mark.parametrize(
    ("score", "expected"),
    [
        (None, "Insufficient data"),
        (0, "Very Overvalued"),
        (19.99, "Very Overvalued"),
        (20, "Overvalued"),
        (39.99, "Overvalued"),
        (40, "Neutral"),
        (59.99, "Neutral"),
        (60, "Undervalued"),
        (79.99, "Undervalued"),
        (80, "Very Undervalued"),
        (100, "Very Undervalued"),
    ],
)
def test_valuation_bands(score, expected):
    assert classify_valuation(score)["label"] == expected


@pytest.mark.parametrize(
    ("score", "expected"),
    [(None, "Insufficient data"), (39.9, "Unfavorable"), (40, "Mixed"), (59.9, "Mixed"), (60, "Supportive")],
)
def test_condition_bands(score, expected):
    assert classify_conditions(score)["label"] == expected


def test_format_value():
    assert format_value(31.25, "multiple") == "31.2x"
    assert format_value(2.5, "percent") == "2.5%"
    assert format_value(-1.234, "percentage_points") == "-1.23 pp"
    assert format_value(72.4, "score", "/100") == "72/100"
    assert format_value(None, "multiple") == "—"
