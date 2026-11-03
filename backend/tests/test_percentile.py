from __future__ import annotations

from datetime import date

import pandas as pd
import pytest

from app.scoring.percentile import (
    component_history,
    expanding_component_for_date,
    latest_observation,
    percentile_rank,
    score_dates_from_prices,
)


def _observations(values, start="2000-01-31", freq="ME", effective_lag=0, estimate_at=None):
    dates = pd.date_range(start, periods=len(values), freq=freq)
    rows = []
    for index, (period, value) in enumerate(zip(dates, values, strict=True)):
        effective = period + pd.Timedelta(days=effective_lag)
        rows.append(
            {
                "indicator_id": "cape",
                "period_date": period.date(),
                "effective_date": effective.date(),
                "value": float(value),
                "is_estimate": estimate_at is not None and index == estimate_at,
                "source": "test",
                "meta": {},
            }
        )
    return pd.DataFrame(rows)


def test_percentile_rank_handles_ties():
    assert percentile_rank([1, 2, 3, 4], 2.5) == 50.0
    assert percentile_rank([1, 2, 3, 4], 2) == 37.5
    assert percentile_rank([], 1) is None


def test_component_history_is_point_in_time():
    frame = _observations(range(1, 133))
    history = component_history(
        frame,
        "cape",
        "inverse_percentile",
        [date(2005, 12, 31)],
        window_years=5,
        min_observations=60,
        staleness_days=40,
    )
    assert len(history) == 1
    row = history.iloc[0]
    assert row["raw_value"] == pytest.approx(72.0)
    assert row["observations_used"] == 61
    assert row["score"] < 1.0
    assert row["effective_date"] == date(2005, 12, 31)


def test_future_observations_do_not_leak_into_scores():
    frame = _observations(range(1, 73))
    future = pd.DataFrame(
        [
            {
                "indicator_id": "cape",
                "period_date": date(2006, 1, 31),
                "effective_date": date(2006, 1, 31),
                "value": 999.0,
                "is_estimate": False,
                "source": "test",
                "meta": {},
            }
        ]
    )
    combined = pd.concat([frame, future], ignore_index=True)
    history = component_history(
        combined,
        "cape",
        "inverse_percentile",
        [date(2005, 12, 31)],
        window_years=5,
        min_observations=60,
        staleness_days=40,
    )
    assert history.iloc[0]["raw_value"] == pytest.approx(72.0)


def test_stale_observation_is_skipped():
    frame = _observations(range(1, 133))
    history = component_history(
        frame,
        "cape",
        "inverse_percentile",
        [date(2012, 1, 31)],
        window_years=10,
        min_observations=120,
        staleness_days=40,
    )
    assert history.empty


def test_estimates_are_excluded():
    frame = _observations(range(1, 73), estimate_at=71)
    history = component_history(
        frame,
        "cape",
        "inverse_percentile",
        [date(2005, 12, 31)],
        window_years=5,
        min_observations=60,
        staleness_days=40,
    )
    assert history.iloc[0]["raw_value"] == pytest.approx(71.0)


def test_effective_date_delays_availability():
    frame = _observations(range(1, 73), effective_lag=30)
    history = component_history(
        frame,
        "cape",
        "inverse_percentile",
        [date(2006, 1, 10)],
        window_years=5,
        min_observations=50,
        staleness_days=40,
    )
    assert history.iloc[0]["raw_value"] == pytest.approx(71.0)


def test_short_window_is_flagged():
    frame = _observations(range(1, 73))
    history = component_history(
        frame,
        "cape",
        "inverse_percentile",
        [date(2005, 12, 31)],
        window_years=10,
        min_observations=60,
        staleness_days=40,
    )
    assert "short_window" in history.iloc[0]["quality"]


def test_direct_scale_transform():
    frame = _observations([25.0])
    history = component_history(
        frame,
        "fear_greed",
        "inverse_level",
        [date(2000, 1, 31)],
        window_years=20,
        min_observations=60,
        staleness_days=10,
    )
    assert history.iloc[0]["score"] == pytest.approx(75.0)
    assert history.iloc[0]["percentile"] is None


def test_expanding_component_for_date():
    frame = _observations(range(1, 133))
    row = expanding_component_for_date(
        frame,
        "cape",
        "inverse_percentile",
        date(2010, 12, 31),
        window_years=10,
        min_observations=120,
        staleness_days=40,
    )
    assert row is not None
    assert row["raw_value"] == pytest.approx(132.0)


def test_latest_observation_respects_effective_date():
    frame = _observations(range(1, 13), effective_lag=10)
    payload = latest_observation(frame, date(2001, 1, 5), staleness_days=90)
    assert payload is not None
    assert payload["period_date"] == date(2000, 11, 30)
    assert payload["age_days"] == 26


def test_score_dates_use_month_ends_and_latest():
    prices = [
        date(2020, 1, 2),
        date(2020, 1, 31),
        date(2020, 2, 3),
        date(2020, 2, 28),
        date(2020, 3, 10),
    ]
    assert score_dates_from_prices(prices, 2020) == [
        date(2020, 1, 31),
        date(2020, 2, 28),
        date(2020, 3, 10),
    ]
    assert score_dates_from_prices(prices, 2021) == []
