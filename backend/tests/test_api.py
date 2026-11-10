from __future__ import annotations

from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.config import DEFAULT_WEIGHTS_PATH, Settings
from app.main import create_app
from app.models import ComponentScore, CompositeScore, IngestRun, Observation
from app.scoring.composite import compute_composite


def _observation(indicator_id, day, value, meta=None):
    return Observation(
        indicator_id=indicator_id,
        period_date=day,
        effective_date=day,
        value=value,
        is_estimate=False,
        source="test",
        meta=meta or {},
    )


def _component(indicator_id, day, score, quality="ok", percentile=50.0):
    return ComponentScore(
        score_date=day,
        indicator_id=indicator_id,
        raw_value=1.0,
        percentile=percentile,
        score=score,
        window_years_used=20.0,
        observations_used=100,
        effective_date=day,
        quality=quality,
        meta={},
    )


@pytest.fixture()
def client(tmp_path):
    settings = Settings(
        database_url=f"sqlite:///{(tmp_path / 'test.db').as_posix()}",
        weights_path=str(DEFAULT_WEIGHTS_PATH),
        validation_output_path=str(tmp_path / "validation.json"),
    )
    app = create_app(settings)
    factory = app.state.session_factory
    as_of = date(2024, 1, 31)
    components = {
        "cape": {
            "score": 30.0,
            "percentile": 70.0,
            "raw_value": 30.0,
            "effective_date": as_of,
            "window_years_used": 20.0,
            "observations_used": 240,
            "quality": "ok",
        },
        "erp": {
            "score": 40.0,
            "percentile": 40.0,
            "raw_value": 1.0,
            "effective_date": as_of,
            "window_years_used": 20.0,
            "observations_used": 240,
            "quality": "proxy",
        },
        "vix": {
            "score": 80.0,
            "percentile": 20.0,
            "raw_value": 15.0,
            "effective_date": as_of,
            "window_years_used": 20.0,
            "observations_used": 240,
            "quality": "ok",
        },
        "rsi": {
            "score": 60.0,
            "percentile": 40.0,
            "raw_value": 55.0,
            "effective_date": as_of,
            "window_years_used": 20.0,
            "observations_used": 240,
            "quality": "ok",
        },
        "ma200_deviation": {
            "score": 70.0,
            "percentile": 30.0,
            "raw_value": 5.0,
            "effective_date": as_of,
            "window_years_used": 20.0,
            "observations_used": 240,
            "quality": "ok",
        },
        "breadth_200dma": {
            "score": 50.0,
            "percentile": 50.0,
            "raw_value": 60.0,
            "effective_date": as_of,
            "window_years_used": 6.0,
            "observations_used": 240,
            "quality": "survivorship",
        },
        "ew_cw_relative": {
            "score": 55.0,
            "percentile": 45.0,
            "raw_value": 0.25,
            "effective_date": as_of,
            "window_years_used": 20.0,
            "observations_used": 240,
            "quality": "ok",
        },
    }
    composite = compute_composite(components, settings.weights)

    with factory() as session:
        session.add_all(
            [
                _observation("cape", date(2024, 1, 31), 30.0),
                _observation("cape", date(2024, 2, 29), 31.0),
                _observation("vix", as_of, 15.0),
                _observation("rsi", as_of, 55.0),
                _observation(
                    "ma200_deviation",
                    as_of,
                    5.0,
                    {"price": 4800.0, "ma200": 4570.0, "ma200_slope_20d": 1.2},
                ),
                _observation(
                    "erp",
                    as_of,
                    1.0,
                    {"earnings_yield": 5.0, "treasury_yield": 4.0, "method": "trailing_proxy"},
                ),
                _observation("breadth_200dma", as_of, 60.0, {"above": 300, "constituents": 500}),
                _observation("ew_cw_relative", as_of, 0.25, {"rsp_norm": 110.0, "spy_norm": 120.0}),
                _observation("buffett", date(2023, 12, 31), 200.0),
            ]
        )
        session.add_all(
            [
                _component("cape", as_of, 30.0, percentile=70.0),
                _component("erp", as_of, 40.0, quality="proxy"),
                _component("vix", as_of, 80.0, percentile=20.0),
                _component("rsi", as_of, 60.0, percentile=40.0),
                _component("ma200_deviation", as_of, 70.0, percentile=30.0),
                _component("breadth_200dma", as_of, 50.0, quality="survivorship"),
                _component("ew_cw_relative", as_of, 55.0),
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
        session.add(
            IngestRun(
                status="ok",
                message="test",
                results=[
                    {"indicator_id": "cape", "status": "ok", "message": ""},
                    {"indicator_id": "forward_pe", "status": "skipped", "message": "not configured"},
                ],
            )
        )
        session.commit()

    with TestClient(app) as test_client:
        yield test_client


def test_dashboard_shape(client):
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "public, max-age=60"
    payload = response.json()
    assert payload["has_data"] is True
    assert payload["as_of"] == "2024-01-31"
    assert len(payload["indicators"]) == 10
    assert payload["overall"]["score"] is not None
    assert payload["categories"]
    assert payload["sentiment"]["is_proxy"] is True
    assert payload["trend"]["available"] is True
    assert payload["freshness"]["total"] == 10
    assert payload["disclaimer"]
    assert len(payload["bands"]) == 5


def test_indicator_history_and_unknown_id(client):
    response = client.get("/api/indicators/cape/history?range=1y")
    assert response.status_code == 200
    payload = response.json()
    assert payload["indicator"]["id"] == "cape"
    assert len(payload["points"]) == 2
    assert payload["points"][0]["date"] == "2024-01-31"

    missing = client.get("/api/indicators/does-not-exist/history")
    assert missing.status_code == 404


def test_composite_history(client):
    response = client.get("/api/composite/history?range=max")
    assert response.status_code == 200
    payload = response.json()
    assert payload["reference_line"] == 50
    assert len(payload["bands"]) == 5
    assert len(payload["points"]) == 1
    assert payload["points"][0]["date"] == "2024-01-31"


def test_methodology_and_health(client):
    methodology = client.get("/api/methodology")
    assert methodology.status_code == 200
    payload = methodology.json()
    assert len(payload["indicators"]) == 10
    assert payload["sources"]
    assert payload["weights_hash"]

    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["latest_score_date"] == "2024-01-31"

    validation = client.get("/api/validation")
    assert validation.status_code == 200
    assert validation.json() == {"validation": None}


def _bare_client(tmp_path, environment):
    settings = Settings(
        database_url=f"sqlite:///{(tmp_path / 'env.db').as_posix()}",
        weights_path=str(DEFAULT_WEIGHTS_PATH),
        validation_output_path=str(tmp_path / "validation.json"),
        environment=environment,
    )
    return TestClient(create_app(settings))


def test_interactive_docs_hidden_in_production(tmp_path):
    client = _bare_client(tmp_path, "production")
    for path in ("/docs", "/redoc", "/openapi.json"):
        assert client.get(path).status_code == 404
    assert "docs" not in client.get("/").json()


def test_interactive_docs_available_in_development(tmp_path):
    client = _bare_client(tmp_path, "development")
    assert client.get("/docs").status_code == 200
    assert client.get("/").json()["docs"] == "/docs"
