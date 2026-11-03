from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from app.ingestion.derived import (
    compute_erp,
    compute_ew_cw,
    compute_ma200,
    compute_rsi,
    erp_observations,
)


def test_rsi_monotonic_series():
    rising = pd.Series(np.arange(1.0, 41.0))
    falling = pd.Series(np.arange(40.0, 0.0, -1.0))
    flat = pd.Series(np.full(40, 10.0))
    assert compute_rsi(rising).iloc[-1] == pytest.approx(100.0)
    assert compute_rsi(falling).iloc[-1] == pytest.approx(0.0)
    assert compute_rsi(flat).iloc[-1] == pytest.approx(50.0)


def test_rsi_warmup_is_nan():
    rsi = compute_rsi(pd.Series(np.arange(1.0, 20.0)))
    assert rsi.iloc[:14].isna().all()
    assert pd.notna(rsi.iloc[14])


def test_ma200_deviation():
    close = pd.Series(np.arange(1.0, 201.0))
    metrics = compute_ma200(close)
    assert metrics["ma200"].iloc[-1] == pytest.approx(100.5)
    assert metrics["deviation"].iloc[-1] == pytest.approx((200 / 100.5 - 1) * 100)


def test_ew_cw_relative_series():
    dates = pd.bdate_range("2020-01-01", periods=300)
    rsp = pd.DataFrame({"date": dates.date, "adjclose": 100 * 1.01 ** np.arange(300)})
    spy = pd.DataFrame({"date": dates.date, "adjclose": 100 * 1.005 ** np.arange(300)})
    relative = compute_ew_cw(rsp, spy)
    assert relative["rsp_norm"].iloc[0] == pytest.approx(100.0)
    assert relative["spy_norm"].iloc[0] == pytest.approx(100.0)
    assert relative["ratio"].iloc[10] == pytest.approx((1.01 / 1.005) ** 10)
    expected = (relative["ratio"].iloc[252] / relative["ratio"].iloc[0] - 1) * 100
    assert relative["rel_252d"].iloc[252] == pytest.approx(expected)


def _earnings():
    return pd.DataFrame(
        [
            {"period_date": pd.Timestamp("2020-01-31"), "effective_date": pd.Timestamp("2020-02-15"), "value": 4.0},
            {"period_date": pd.Timestamp("2020-02-29"), "effective_date": pd.Timestamp("2020-03-15"), "value": 5.0},
        ]
    )


def _treasury():
    return pd.DataFrame(
        [
            {"period_date": pd.Timestamp("2020-02-01"), "value": 1.5},
            {"period_date": pd.Timestamp("2020-02-10"), "value": 1.4},
            {"period_date": pd.Timestamp("2020-03-01"), "value": 1.0},
            {"period_date": pd.Timestamp("2020-04-01"), "value": 0.5},
            {"period_date": pd.Timestamp("2021-01-01"), "value": 0.8},
        ]
    )


def test_erp_uses_available_earnings_only():
    erp, method = compute_erp(_earnings(), _treasury())
    assert method == "trailing_proxy"
    by_date = {row.period_date.date(): row.value for row in erp.itertuples()}
    assert pd.Timestamp("2020-02-10").date() not in by_date
    assert by_date[pd.Timestamp("2020-03-01").date()] == pytest.approx(4.0 - 1.0)
    assert by_date[pd.Timestamp("2020-04-01").date()] == pytest.approx(5.0 - 0.5)
    assert pd.Timestamp("2021-01-01").date() not in by_date


def test_erp_forward_requires_feed():
    with pytest.raises(ValueError):
        compute_erp(_earnings(), _treasury(), method="forward")


def test_erp_forward_uses_forward_pe():
    forward = pd.DataFrame(
        [
            {"period_date": pd.Timestamp("2020-01-31"), "effective_date": pd.Timestamp("2020-02-15"), "value": 20.0}
        ]
    )
    erp, method = compute_erp(_earnings(), _treasury(), forward_pe=forward, method="forward")
    assert method == "forward"
    by_date = {row.period_date.date(): row.value for row in erp.itertuples()}
    assert by_date[pd.Timestamp("2020-03-01").date()] == pytest.approx(5.0 - 1.0)


def test_erp_observation_builder():
    erp, method = compute_erp(_earnings(), _treasury())
    observations = erp_observations(erp, method)
    assert not observations.empty
    assert set(observations.columns) >= {
        "period_date",
        "effective_date",
        "value",
        "source",
        "meta",
    }
    assert observations["meta"].iloc[0]["method"] == "trailing_proxy"
