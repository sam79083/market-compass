"""NASDAQ-100 P/E snapshots and the NASDAQ equity risk premium built from them."""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
import fetch_nasdaq_pe as script  # noqa: E402

from app.ingestion.base import make_frame  # noqa: E402
from app.ingestion.derived import compute_nasdaq_erp, nasdaq_erp_observations  # noqa: E402


def test_valid_pe_bounds():
    assert script.valid_pe("35.1") == 35.1
    for bad in (None, "n/a", 0, -3, 4.9, 151, float("nan")):
        assert script.valid_pe(bad) is None


def test_weighted_harmonic_pe_is_total_cap_over_total_earnings():
    # caps 300 @ P/E 30 -> earnings 10; 100 @ 10 -> earnings 10: 400 / 20 = 20
    assert script.weighted_harmonic_pe([(300.0, 30.0), (100.0, 10.0)]) == pytest.approx(20.0)


def test_weighted_harmonic_pe_drops_loss_makers_and_missing_data():
    rows = [(300.0, 30.0), (100.0, 10.0), (500.0, None), (200.0, -12.0), (None, 20.0), (0, 20.0)]
    assert script.weighted_harmonic_pe(rows) == pytest.approx(20.0)
    assert script.weighted_harmonic_pe([(100.0, None)]) is None


def test_upsert_creates_sorts_and_replaces_same_day(tmp_path):
    path = tmp_path / "nested" / "nasdaq_pe.csv"
    script.upsert(path, "2026-11-10", 35.2, "a")
    script.upsert(path, "2026-11-09", 35.0, "a")
    script.upsert(path, "2026-11-10", 35.4, "b")  # same day: replaced, not duplicated
    frame = pd.read_csv(path)
    assert list(frame.columns) == ["date", "value", "source"]
    assert frame["date"].tolist() == ["2026-11-09", "2026-11-10"]
    assert frame["value"].tolist() == [35.0, 35.4]
    assert frame["source"].tolist() == ["a", "b"]


def _frame(rows):
    return make_frame(
        [
            {
                "period_date": day,
                "effective_date": day,
                "value": value,
                "is_estimate": False,
                "source": "t",
                "meta": {},
            }
            for day, value in rows
        ]
    )


def test_nasdaq_erp_is_earnings_yield_minus_treasury():
    pe = _frame([(date(2026, 11, 9), 25.0), (date(2026, 11, 10), 20.0)])
    treasury = _frame([(date(2026, 11, 6), 4.0), (date(2026, 11, 10), 4.5)])
    out = compute_nasdaq_erp(pe, treasury)
    # 11-09 pairs with the 11-06 yield (latest on or before): 100/25 - 4.0 = 0.0
    # 11-10 pairs with the same-day yield: 100/20 - 4.5 = 0.5
    assert out["value"].tolist() == pytest.approx([0.0, 0.5])
    observations = nasdaq_erp_observations(out)
    assert observations["meta"].iloc[-1]["pe"] == 20.0
    assert observations["meta"].iloc[-1]["method"] == "trailing_proxy"


def test_nasdaq_erp_needs_both_inputs_and_fresh_yields():
    pe = _frame([(date(2026, 11, 9), 25.0)])
    assert compute_nasdaq_erp(pe, _frame([])).empty
    assert compute_nasdaq_erp(_frame([]), pe).empty
    stale = _frame([(date(2026, 1, 2), 4.0)])  # months before the snapshot
    assert compute_nasdaq_erp(pe, stale).empty
