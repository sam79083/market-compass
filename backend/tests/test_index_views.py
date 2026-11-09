"""The S&P 500 and NASDAQ views must show different data.

Regression tests for two bugs: the static export never wrote the per-index dashboard files the
frontend requests (HTTP 404), and the NASDAQ view re-labelled the S&P 500 series so both views
displayed identical numbers.
"""

from __future__ import annotations

import json
from datetime import date

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.config import DEFAULT_WEIGHTS_PATH, Settings
from app.db import init_db, make_engine, make_session_factory
from app.indicators import INDICATORS_NASDAQ, series_id_for
from app.ingestion.derived import (
    compute_ew_cw,
    ew_cw_observations,
    ma200_observations,
    rsi_observations,
)
from app.ingestion.pipeline import _replace_observations
from app.main import create_app
from app.models import Observation
from app.scoring.engine import refresh_scores
from app.services.dashboard import build_dashboard
from app.services.history import get_composite_history, get_indicator_history
from app.static_export import export_static

DAYS = pd.bdate_range("2019-01-01", "2024-06-28").date


def _prices(seed: int, start: float) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    close = start * np.exp(np.cumsum(rng.normal(0.0004, 0.012, len(DAYS))))
    return pd.DataFrame({"date": DAYS, "close": close, "adjclose": close})


def _price_rows(frame: pd.DataFrame, source: str) -> pd.DataFrame:
    from app.ingestion.base import make_frame

    return make_frame(
        [
            {
                "period_date": row.date,
                "effective_date": row.date,
                "value": float(row.close),
                "is_estimate": False,
                "source": source,
                "meta": {"close": float(row.close), "adjclose": float(row.adjclose)},
            }
            for row in frame.itertuples()
        ]
    )


@pytest.fixture()
def seeded(tmp_path):
    settings = Settings(
        database_url=f"sqlite:///{(tmp_path / 'views.db').as_posix()}",
        weights_path=str(DEFAULT_WEIGHTS_PATH),
        validation_output_path=str(tmp_path / "validation.json"),
    )
    engine = make_engine(settings)
    init_db(engine)
    factory = make_session_factory(engine)

    sp500, nasdaq = _prices(1, 3000.0), _prices(2, 9000.0)
    rsp, spy = _prices(3, 100.0), _prices(4, 300.0)
    qqew, qqq = _prices(5, 50.0), _prices(6, 200.0)
    vix, vxn = _prices(7, 18.0), _prices(8, 24.0)

    with factory() as session:
        series = {
            "sp500_price": _price_rows(sp500, "test sp500"),
            "rsi": rsi_observations(sp500, "test"),
            "ma200_deviation": ma200_observations(sp500, "test"),
            "ew_cw_relative": ew_cw_observations(compute_ew_cw(rsp, spy), "test"),
            "vix": _price_rows(vix, "test vix"),
            "nasdaq_price": _price_rows(nasdaq, "test nasdaq"),
            "nasdaq_rsi": rsi_observations(nasdaq, "test"),
            "nasdaq_ma200_deviation": ma200_observations(nasdaq, "test"),
            "nasdaq_ew_cw_relative": ew_cw_observations(compute_ew_cw(qqew, qqq), "test"),
            "vxn": _price_rows(vxn, "test vxn"),
        }
        for series_id, frame in series.items():
            _replace_observations(session, series_id, frame)
        # S&P 500-only inputs. The NASDAQ view must never pick these up.
        for series_id, value in {
            "cape": 33.0,
            "forward_pe": 21.0,
            "erp": 1.5,
            "breadth_200dma": 61.0,
        }.items():
            session.add(
                Observation(
                    indicator_id=series_id,
                    period_date=date(2024, 6, 28),
                    effective_date=date(2024, 6, 28),
                    value=value,
                    is_estimate=False,
                    source="test sp500 only",
                    meta={},
                )
            )
        # Market cap / GDP is whole-market and shared by both views; NASDAQ-100 breadth is its own
        # series and deliberately differs from the S&P 500 value above.
        for series_id, value in {
            "buffett": 190.0,
            "nasdaq_breadth_200dma": 47.0,
            "nasdaq_erp": 0.8,
        }.items():
            session.add(
                Observation(
                    indicator_id=series_id,
                    period_date=date(2024, 6, 28),
                    effective_date=date(2024, 6, 28),
                    value=value,
                    is_estimate=False,
                    source="test",
                    meta={},
                )
            )
        session.commit()
        refresh_scores(session, settings)
    return settings, factory


def _by_id(dashboard):
    return {item["id"]: item for item in dashboard["indicators"]}


def test_nasdaq_dashboard_reads_nasdaq_series(seeded):
    settings, factory = seeded
    with factory() as session:
        sp = build_dashboard(session, settings, "sp500")
        nq = build_dashboard(session, settings, "nasdaq")
        last_nasdaq_rsi = (
            session.query(Observation)
            .filter(Observation.indicator_id == "nasdaq_rsi")
            .order_by(Observation.period_date.desc())
            .first()
        )

    assert sp["index"] == "sp500" and nq["index"] == "nasdaq"
    sp_ind, nq_ind = _by_id(sp), _by_id(nq)
    for indicator_id in ("rsi", "ma200_deviation", "vix", "ew_cw_relative"):
        assert sp_ind[indicator_id]["latest"]["value"] != nq_ind[indicator_id]["latest"]["value"]
    assert nq_ind["rsi"]["latest"]["value"] == pytest.approx(last_nasdaq_rsi.value)
    assert nq["trend"]["price"] != sp["trend"]["price"]
    assert nq_ind["vix"]["short_name"] == "VXN"


def test_nasdaq_does_not_borrow_sp500_only_indicators(seeded):
    settings, factory = seeded
    with factory() as session:
        nq = _by_id(build_dashboard(session, settings, "nasdaq"))
        sp = _by_id(build_dashboard(session, settings, "sp500"))

    # CAPE and forward P/E have no NASDAQ source, so they stay unavailable.
    for indicator_id in ("cape", "forward_pe"):
        assert sp[indicator_id]["latest"] is not None  # S&P 500 does have these
        assert nq[indicator_id]["latest"] is None
        assert nq[indicator_id]["status"] == "unavailable"
        assert nq[indicator_id]["unavailable_reason"]

    # Breadth reads the NASDAQ-100 series, never the S&P 500 one.
    assert nq["breadth_200dma"]["latest"]["value"] == pytest.approx(47.0)
    assert sp["breadth_200dma"]["latest"]["value"] == pytest.approx(61.0)

    # The NASDAQ ERP reads its own series, never the S&P 500 value (1.5).
    assert nq["erp"]["latest"]["value"] == pytest.approx(0.8)
    assert sp["erp"]["latest"]["value"] == pytest.approx(1.5)


def test_market_cap_to_gdp_is_shared_by_both_views(seeded):
    settings, factory = seeded
    with factory() as session:
        nq = _by_id(build_dashboard(session, settings, "nasdaq"))
        sp = _by_id(build_dashboard(session, settings, "sp500"))
    assert nq["buffett"]["latest"]["value"] == pytest.approx(190.0)
    assert sp["buffett"]["latest"]["value"] == pytest.approx(190.0)
    assert nq["buffett"]["status"] != "unavailable"


def test_nasdaq_composite_scores_available_categories_only(seeded):
    settings, factory = seeded
    with factory() as session:
        overall = build_dashboard(session, settings, "nasdaq")["overall"]
        sp_overall = build_dashboard(session, settings, "sp500")["overall"]
    nasdaq_weights = settings.weights.for_index("nasdaq")
    assert nasdaq_weights.overall["fundamental"] == 0.0
    assert nasdaq_weights.overall["sentiment"] > 0
    # The NASDAQ composite is computed from sentiment + breadth (the only categories it
    # can measure) instead of being withheld outright.
    assert overall["score"] is not None
    assert overall["coverage"] >= settings.weights.minimum_coverage
    assert overall["conditions"]["score"] is not None
    assert overall["long_term"]["label"] == "Insufficient data"
    assert "nasdaq_conditions_only" in overall["quality_flags"]
    assert overall["score"] != sp_overall["score"]


def test_index_definitions_have_no_silent_sp500_fallback():
    # Every NASDAQ indicator is either backed by a NASDAQ-specific series, is explicitly
    # unavailable, or is the one deliberately shared market-wide series (Fear & Greed).
    sp500_series = {"sp500_price", "rsp", "spy", "cape", "forward_pe", "erp", "buffett",
                    "breadth_200dma", "rsi", "ma200_deviation", "ew_cw_relative", "vix"}
    for indicator_id, definition in INDICATORS_NASDAQ.items():
        series_id = series_id_for(definition)
        if series_id is None:
            assert definition.unavailable_reason
        elif indicator_id not in {"fear_greed", "buffett"}:  # deliberately market-wide
            assert series_id not in sp500_series


def test_export_static_writes_the_files_the_frontend_requests(seeded, tmp_path):
    settings, factory = seeded
    out = tmp_path / "data"
    with factory() as session:
        export_static(session, settings, out)

    # Names requested by frontend/src/api.ts in static mode.
    for name in (
        "dashboard.sp500.json",
        "dashboard.nasdaq.json",
        "composite-history.json",
        "composite-history.nasdaq.json",
        "methodology.json",
    ):
        assert (out / name).exists(), name
    for indicator_id in INDICATORS_NASDAQ:
        assert (out / "indicators" / f"{indicator_id}.json").exists()
        assert (out / "indicators" / "nasdaq" / f"{indicator_id}.json").exists()

    sp = json.loads((out / "dashboard.sp500.json").read_text(encoding="utf-8"))
    nq = json.loads((out / "dashboard.nasdaq.json").read_text(encoding="utf-8"))
    assert sp["trend"]["price"] != nq["trend"]["price"]
    assert sp["indicators"] != nq["indicators"]

    sp_rsi = json.loads((out / "indicators" / "rsi.json").read_text(encoding="utf-8"))
    nq_rsi = json.loads((out / "indicators" / "nasdaq" / "rsi.json").read_text(encoding="utf-8"))
    assert sp_rsi["points"][-1]["value"] != nq_rsi["points"][-1]["value"]


def test_unavailable_nasdaq_indicator_history_is_empty_not_sp500(seeded):
    settings, factory = seeded
    with factory() as session:
        nq_cape = get_indicator_history(session, settings, "cape", "max", "nasdaq")
        sp_cape = get_indicator_history(session, settings, "cape", "max", "sp500")
        nq_history = get_composite_history(session, settings, "max", "nasdaq")
        sp_history = get_composite_history(session, settings, "max", "sp500")
    assert nq_cape["points"] == []
    assert sp_cape["points"]
    # A NASDAQ composite now exists, but never with a S&P-only valuation component.
    assert nq_history["points"]
    assert nq_history["weights_hash"] != sp_history["weights_hash"]
    for point in nq_history["points"]:
        assert point["components"]["cape"]["available"] is False


def test_api_index_parameter_selects_the_index(seeded):
    settings, _ = seeded
    client = TestClient(create_app(settings))

    sp = client.get("/api/dashboard", params={"index": "sp500"}).json()
    nq = client.get("/api/dashboard", params={"index": "nasdaq"}).json()
    assert sp["trend"]["price"] != nq["trend"]["price"]

    sp_rsi = client.get("/api/indicators/rsi/history").json()
    nq_rsi = client.get("/api/indicators/rsi/history", params={"index": "nasdaq"}).json()
    assert sp_rsi["points"][-1]["value"] != nq_rsi["points"][-1]["value"]

    assert client.get("/api/dashboard", params={"index": "dax"}).status_code == 422
