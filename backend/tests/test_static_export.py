from __future__ import annotations

import json
from datetime import date

from app.config import DEFAULT_WEIGHTS_PATH, Settings
from app.db import init_db, make_engine, make_session_factory
from app.indicators import INDICATORS
from app.models import CompositeScore, Observation
from app.scoring.composite import compute_composite
from app.static_export import export_static

AVAILABLE = ["cape", "erp", "vix", "rsi", "ma200_deviation", "breadth_200dma", "ew_cw_relative"]


def test_export_static_writes_snapshots(tmp_path):
    settings = Settings(
        database_url=f"sqlite:///{(tmp_path / 'test.db').as_posix()}",
        weights_path=str(DEFAULT_WEIGHTS_PATH),
        validation_output_path=str(tmp_path / "validation.json"),
    )
    engine = make_engine(settings)
    init_db(engine)
    factory = make_session_factory(engine)
    as_of = date(2024, 1, 31)

    components = {
        indicator_id: {
            "score": 50.0,
            "percentile": 50.0,
            "raw_value": 1.0,
            "effective_date": as_of,
            "window_years_used": 20.0,
            "observations_used": 240,
            "quality": "ok",
        }
        for indicator_id in AVAILABLE
    }
    composite = compute_composite(components, settings.weights)

    with factory() as session:
        session.add_all(
            [
                Observation(
                    indicator_id=indicator_id,
                    period_date=as_of,
                    effective_date=as_of,
                    value=1.0,
                    is_estimate=False,
                    source="test",
                    meta={},
                )
                for indicator_id in AVAILABLE
            ]
        )
        session.add(
            CompositeScore(
                score_date=as_of,
                score=composite["score"],
                classification=composite["classification"],
                coverage=composite["coverage"],
                confidence=composite["confidence"],
                categories=composite["categories"],
                components=composite["components"],
                explanation={
                    "long_term": composite["long_term"],
                    "conditions": composite["conditions"],
                    "quality_flags": composite["quality_flags"],
                },
                weights_hash=composite["weights_hash"],
            )
        )
        session.commit()

        validation = {"n_scores": 1, "horizons": {}}
        (tmp_path / "validation.json").write_text(json.dumps(validation), encoding="utf-8")

        out = tmp_path / "data"
        result = export_static(session, settings, out)

    assert result["status"] == "ok"
    # dashboard.json + dashboard.{sp500,nasdaq}.json, composite-history{,.nasdaq}.json,
    # price-history.{sp500,nasdaq}.json, sectors.json, methodology.json, validation.json,
    # and one history file per indicator per index.
    assert result["files"] == 2 * len(INDICATORS) + 10
    assert (out / "dashboard.json").exists()
    assert (out / "composite-history.json").exists()
    assert (out / "price-history.nasdaq.json").exists()
    assert (out / "sectors.json").exists()
    assert (out / "methodology.json").exists()
    assert (out / "validation.json").exists()
    assert len(list((out / "indicators").glob("*.json"))) == len(INDICATORS)

    dashboard = json.loads((out / "dashboard.json").read_text(encoding="utf-8"))
    assert dashboard["has_data"] is True
    assert dashboard["as_of"] == as_of.isoformat()
    assert len(dashboard["indicators"]) == len(INDICATORS)

    history = json.loads((out / "composite-history.json").read_text(encoding="utf-8"))
    assert history["points"][0]["date"] == as_of.isoformat()

    methodology = json.loads((out / "methodology.json").read_text(encoding="utf-8"))
    assert len(methodology["indicators"]) == len(INDICATORS)
    assert methodology["validation"]["n_scores"] == 1
