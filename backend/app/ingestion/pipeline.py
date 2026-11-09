from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

import pandas as pd
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.config import Settings
from app.indicators import INDICATORS
from app.ingestion.base import SeriesResult
from app.ingestion.breadth import fetch_breadth, fetch_nasdaq_breadth
from app.ingestion.cboe import fetch_vix
from app.ingestion.csv_feed import load_csv_feed
from app.ingestion.free_fear_greed import fetch_free_fear_greed
from app.ingestion.derived import (
        compute_erp,
        compute_ew_cw,
        erp_observations,
        ew_cw_observations,
        ma200_observations,
        nasdaq_erp_observations,
        compute_nasdaq_erp,
        rsi_observations,
    )
from app.ingestion.fetch import HttpClient
from app.ingestion.shiller import fetch_shiller
from app.ingestion.treasury import fetch_treasury_10y
from app.ingestion.worldbank import fetch_buffett
from app.ingestion.yahoo import fetch_yahoo_series
from app.models import IngestRun, Observation
from app.scoring.engine import refresh_scores

logger = logging.getLogger(__name__)


def _replace_observations(session: Session, indicator_id: str, frame: pd.DataFrame) -> int:
    session.execute(delete(Observation).where(Observation.indicator_id == indicator_id))
    if frame is None or frame.empty:
        return 0
    rows = []
    for row in frame.itertuples():
        rows.append(
            Observation(
                indicator_id=indicator_id,
                period_date=row.period_date,
                effective_date=row.effective_date,
                value=float(row.value),
                is_estimate=bool(row.is_estimate),
                source=str(row.source),
                meta=row.meta if isinstance(row.meta, dict) else {},
            )
        )
    session.add_all(rows)
    return len(rows)


def _store_result(session: Session, result: SeriesResult) -> dict[str, Any]:
    if result.ok:
        count = _replace_observations(session, result.indicator_id, result.observations)
        return {**result.to_status(), "stored": count}
    return {**result.to_status(), "stored": 0}


def _error_result(indicator_id: str, exc: Exception, source: str = "") -> SeriesResult:
    return SeriesResult(
        indicator_id=indicator_id,
        status="error",
        message=str(exc)[:500],
        source=source,
    )


def _skipped_result(indicator_id: str, message: str, source: str = "") -> SeriesResult:
    return SeriesResult(
        indicator_id=indicator_id,
        status="skipped",
        message=message,
        source=source,
    )


def _derived_result(
    indicator_id: str,
    frame: pd.DataFrame,
    source: str,
    message: str,
) -> SeriesResult:
    if frame is None or frame.empty:
        return SeriesResult(
            indicator_id=indicator_id,
            status="skipped",
            message=message,
            source=source,
        )
    return SeriesResult(
        indicator_id=indicator_id,
        status="ok",
        observations=frame,
        source=source,
        message=message,
    )


def run_refresh(
    session: Session,
    settings: Settings,
    include_breadth: bool = True,
    run_validation: bool = False,
) -> dict[str, Any]:
    run = IngestRun(status="running", message="Refresh started")
    session.add(run)
    session.commit()
    session.refresh(run)
    results: list[dict[str, Any]] = []
    series_results: dict[str, SeriesResult] = {}
    price_frames: dict[str, pd.DataFrame] = {}

    with HttpClient(settings) as client:
        try:
            shiller = fetch_shiller(settings, client)
        except Exception as exc:
            logger.exception("Shiller ingestion failed")
            shiller = {
                "cape": _error_result("cape", exc, "Robert Shiller"),
                "earnings_yield": _error_result("earnings_yield", exc, "Robert Shiller"),
                "cpi": _error_result("cpi", exc, "Robert Shiller"),
            }
        for key, result in shiller.items():
            series_results[key] = result
            results.append(_store_result(session, result))

        try:
            vix = fetch_vix(settings, client)
        except Exception as exc:
            logger.exception("Cboe ingestion failed")
            vix = _error_result("vix", exc, "Cboe")
        series_results["vix"] = vix
        results.append(_store_result(session, vix))

        try:
            treasury = fetch_treasury_10y(settings, client)
        except Exception as exc:
            logger.exception("Treasury ingestion failed")
            treasury = _error_result("treasury_10y", exc, "U.S. Treasury")
        series_results["treasury_10y"] = treasury
        results.append(_store_result(session, treasury))

        try:
            buffett = fetch_buffett(settings, client)
        except Exception as exc:
            logger.exception("World Bank ingestion failed")
            buffett = _error_result("buffett", exc, "World Bank")
        series_results["buffett"] = buffett
        results.append(_store_result(session, buffett))

        for symbol, indicator_id, adjusted, label in [
            ("^GSPC", "sp500_price", False, "Yahoo Finance / S&P 500"),
            ("RSP", "rsp", True, "Yahoo Finance / RSP adjusted close"),
            ("SPY", "spy", True, "Yahoo Finance / SPY adjusted close"),
            # NASDAQ view: its own price, volatility and equal-weight/cap-weight series.
            ("^IXIC", "nasdaq_price", False, "Yahoo Finance / NASDAQ Composite"),
            ("^VXN", "vxn", False, "Yahoo Finance / Cboe NASDAQ-100 Volatility (VXN)"),
            ("QQQ", "qqq", True, "Yahoo Finance / QQQ adjusted close"),
            ("QQEW", "qqew", True, "Yahoo Finance / QQEW adjusted close"),
        ]:
            try:
                result, frame = fetch_yahoo_series(
                    settings, client, symbol, indicator_id, adjusted, label
                )
            except Exception as exc:
                logger.exception("Yahoo ingestion failed for %s", symbol)
                result = _error_result(indicator_id, exc, "Yahoo Finance")
                frame = pd.DataFrame(columns=["date", "close", "adjclose"])
            series_results[indicator_id] = result
            price_frames[indicator_id] = frame
            results.append(_store_result(session, result))

        if settings.forward_pe_csv_url:
            try:
                forward_pe = load_csv_feed(
                    settings,
                    client,
                    "forward_pe",
                    settings.forward_pe_csv_url,
                    "FactSet Earnings Insight (weekly report)",
                    settings.forward_pe_earnings_basis,
                )
            except Exception as exc:
                forward_pe = _error_result(
                    "forward_pe", exc, "FactSet Earnings Insight (weekly report)"
                )
        else:
            forward_pe = _skipped_result(
                "forward_pe",
                INDICATORS["forward_pe"].unavailable_reason or "No forward P/E feed configured.",
                "FactSet Earnings Insight (weekly report)",
            )
        series_results["forward_pe"] = forward_pe
        results.append(_store_result(session, forward_pe))

        if settings.nasdaq_pe_csv_url:
            try:
                nasdaq_pe = load_csv_feed(
                    settings,
                    client,
                    "nasdaq_pe",
                    settings.nasdaq_pe_csv_url,
                    "NASDAQ-100 trailing P/E (daily snapshots)",
                )
            except Exception as exc:
                nasdaq_pe = _error_result(
                    "nasdaq_pe", exc, "NASDAQ-100 trailing P/E (daily snapshots)"
                )
        else:
            nasdaq_pe = _skipped_result(
                "nasdaq_pe",
                "No NASDAQ-100 P/E snapshot file is configured (NASDAQ_PE_CSV_URL).",
                "NASDAQ-100 trailing P/E (daily snapshots)",
            )
        series_results["nasdaq_pe"] = nasdaq_pe
        results.append(_store_result(session, nasdaq_pe))

        if settings.fear_greed_csv_url:
            try:
                fear_greed = load_csv_feed(
                    settings,
                    client,
                    "fear_greed",
                    settings.fear_greed_csv_url,
                    "Authorized Fear & Greed feed",
                )
            except Exception as exc:
                fear_greed = _error_result("fear_greed", exc, "Authorized Fear & Greed feed")
        else:
            # Try free Fear & Greed data source as a fallback
            try:
                fear_greed = fetch_free_fear_greed(settings, client)
            except Exception as exc:
                fear_greed = _error_result("fear_greed", exc, "free Fear & Greed feed")
        series_results["fear_greed"] = fear_greed
        results.append(_store_result(session, fear_greed))

        if include_breadth and settings.breadth_enabled:
            try:
                breadth = fetch_breadth(settings, client)
            except Exception as exc:
                logger.exception("Breadth ingestion failed")
                breadth = _error_result("breadth_200dma", exc, "S&P 500 constituents")
        else:
            breadth = _skipped_result(
                "breadth_200dma",
                "Breadth ingestion is disabled for this run.",
                "S&P 500 constituents",
            )
        series_results["breadth_200dma"] = breadth
        results.append(_store_result(session, breadth))

        if include_breadth and settings.breadth_enabled:
            try:
                nasdaq_breadth = fetch_nasdaq_breadth(settings, client)
            except Exception as exc:
                logger.exception("NASDAQ-100 breadth ingestion failed")
                nasdaq_breadth = _error_result(
                    "nasdaq_breadth_200dma", exc, "NASDAQ-100 constituents"
                )
        else:
            nasdaq_breadth = _skipped_result(
                "nasdaq_breadth_200dma",
                "Breadth ingestion is disabled for this run.",
                "NASDAQ-100 constituents",
            )
        series_results["nasdaq_breadth_200dma"] = nasdaq_breadth
        results.append(_store_result(session, nasdaq_breadth))

    price_obs = series_results.get("sp500_price")
    if price_obs and price_obs.ok:
        try:
            rsi = rsi_observations(
                price_frames["sp500_price"], "S&P 500 daily closes / Wilder RSI"
            )
            rsi_result = _derived_result(
                "rsi", rsi, "S&P 500 daily closes / Wilder RSI", f"Computed {len(rsi)} RSI observations"
            )
        except Exception as exc:
            rsi_result = _error_result("rsi", exc, "S&P 500 daily closes")
    else:
        rsi_result = _skipped_result("rsi", "S&P 500 price history is unavailable.")
    series_results["rsi"] = rsi_result
    results.append(_store_result(session, rsi_result))

    if price_obs and price_obs.ok:
        try:
            ma200 = ma200_observations(
                price_frames["sp500_price"], "S&P 500 daily closes / 200-day SMA"
            )
            ma200_result = _derived_result(
                "ma200_deviation",
                ma200,
                "S&P 500 daily closes / 200-day SMA",
                f"Computed {len(ma200)} 200-day deviation observations",
            )
        except Exception as exc:
            ma200_result = _error_result("ma200_deviation", exc, "S&P 500 daily closes")
    else:
        ma200_result = _skipped_result("ma200_deviation", "S&P 500 price history is unavailable.")
    series_results["ma200_deviation"] = ma200_result
    results.append(_store_result(session, ma200_result))

    rsp = series_results.get("rsp")
    spy = series_results.get("spy")
    if rsp and spy and rsp.ok and spy.ok:
        try:
            relative = compute_ew_cw(price_frames["rsp"], price_frames["spy"])
            ew_cw = ew_cw_observations(relative, "RSP/SPY adjusted closes")
            ew_cw_result = _derived_result(
                "ew_cw_relative",
                ew_cw,
                "RSP/SPY adjusted closes",
                f"Computed {len(ew_cw)} relative-performance observations",
            )
        except Exception as exc:
            ew_cw_result = _error_result("ew_cw_relative", exc, "RSP/SPY adjusted closes")
    else:
        ew_cw_result = _skipped_result(
            "ew_cw_relative", "RSP and/or SPY price history is unavailable."
        )
    series_results["ew_cw_relative"] = ew_cw_result
    results.append(_store_result(session, ew_cw_result))

    # NASDAQ-view derived series, computed from NASDAQ prices (never from S&P 500 prices).
    nasdaq_price = series_results.get("nasdaq_price")
    nasdaq_ok = bool(nasdaq_price and nasdaq_price.ok)
    for series_id, builder, source in [
        ("nasdaq_rsi", rsi_observations, "NASDAQ Composite daily closes / Wilder RSI"),
        (
            "nasdaq_ma200_deviation",
            ma200_observations,
            "NASDAQ Composite daily closes / 200-day SMA",
        ),
    ]:
        if nasdaq_ok:
            try:
                derived = builder(price_frames["nasdaq_price"], source)
                derived_result = _derived_result(
                    series_id, derived, source, f"Computed {len(derived)} observations"
                )
            except Exception as exc:
                derived_result = _error_result(series_id, exc, source)
        else:
            derived_result = _skipped_result(series_id, "NASDAQ price history is unavailable.")
        series_results[series_id] = derived_result
        results.append(_store_result(session, derived_result))

    qqq = series_results.get("qqq")
    qqew = series_results.get("qqew")
    if qqq and qqew and qqq.ok and qqew.ok:
        try:
            # compute_ew_cw takes (equal-weight, cap-weight) frames.
            nasdaq_relative = compute_ew_cw(price_frames["qqew"], price_frames["qqq"])
            nasdaq_ew_cw = ew_cw_observations(nasdaq_relative, "QQEW/QQQ adjusted closes")
            nasdaq_ew_cw_result = _derived_result(
                "nasdaq_ew_cw_relative",
                nasdaq_ew_cw,
                "QQEW/QQQ adjusted closes",
                f"Computed {len(nasdaq_ew_cw)} relative-performance observations",
            )
        except Exception as exc:
            nasdaq_ew_cw_result = _error_result(
                "nasdaq_ew_cw_relative", exc, "QQEW/QQQ adjusted closes"
            )
    else:
        nasdaq_ew_cw_result = _skipped_result(
            "nasdaq_ew_cw_relative", "QQEW and/or QQQ price history is unavailable."
        )
    series_results["nasdaq_ew_cw_relative"] = nasdaq_ew_cw_result
    results.append(_store_result(session, nasdaq_ew_cw_result))

    nasdaq_pe_result = series_results.get("nasdaq_pe")
    treasury_for_nasdaq = series_results.get("treasury_10y")
    if (
        nasdaq_pe_result
        and treasury_for_nasdaq
        and nasdaq_pe_result.ok
        and treasury_for_nasdaq.ok
    ):
        try:
            nasdaq_erp_frame = compute_nasdaq_erp(
                nasdaq_pe_result.observations, treasury_for_nasdaq.observations
            )
            nasdaq_erp = nasdaq_erp_observations(nasdaq_erp_frame)
            nasdaq_erp_result = _derived_result(
                "nasdaq_erp",
                nasdaq_erp,
                "NASDAQ-100 trailing earnings yield - 10Y Treasury",
                f"Computed {len(nasdaq_erp)} NASDAQ equity risk premium observations",
            )
        except Exception as exc:
            nasdaq_erp_result = _error_result("nasdaq_erp", exc, "NASDAQ-100 P/E + Treasury")
    else:
        nasdaq_erp_result = _skipped_result(
            "nasdaq_erp", "NASDAQ-100 P/E snapshots and/or the 10Y Treasury yield are unavailable."
        )
    series_results["nasdaq_erp"] = nasdaq_erp_result
    results.append(_store_result(session, nasdaq_erp_result))

    earnings = series_results.get("earnings_yield")
    treasury_result = series_results.get("treasury_10y")
    if earnings and treasury_result and earnings.ok and treasury_result.ok:
        try:
            forward_frame = (
                series_results["forward_pe"].observations
                if series_results.get("forward_pe") and series_results["forward_pe"].ok
                else None
            )
            erp_frame, method = compute_erp(
                earnings.observations,
                treasury_result.observations,
                forward_frame,
                settings.erp_method,
                settings.weights.staleness("erp"),
            )
            erp = erp_observations(erp_frame, method)
            erp_result = _derived_result(
                "erp",
                erp,
                "Forward earnings yield - 10Y Treasury"
                if method == "forward"
                else "Shiller trailing earnings yield - 10Y Treasury",
                f"Computed {len(erp)} ERP proxy observations ({method})",
            )
        except Exception as exc:
            erp_result = _error_result("erp", exc, "Earnings yield and Treasury")
    else:
        erp_result = _skipped_result(
            "erp", "Earnings yield and/or Treasury yield history is unavailable."
        )
    series_results["erp"] = erp_result
    results.append(_store_result(session, erp_result))

    session.commit()
    score_summary: dict[str, Any] = {}
    try:
        score_summary = refresh_scores(session, settings)
        run.status = "success" if score_summary.get("status") == "ok" else "partial"
        run.message = "Refresh completed"
    except Exception as exc:
        logger.exception("Scoring failed")
        session.rollback()
        run.status = "failed"
        run.message = f"Scoring failed: {exc}"[:500]

    if run_validation and run.status != "failed":
        try:
            from app.scoring.validation import compute_validation, write_validation

            validation = compute_validation(session, settings)
            write_validation(validation, settings)
            score_summary["validation"] = "written"
        except Exception as exc:
            logger.exception("Validation failed")
            score_summary["validation_error"] = str(exc)

    run.finished_at = datetime.now(UTC)
    run.results = results
    session.add(run)
    session.commit()
    return {
        "run_id": run.id,
        "status": run.status,
        "message": run.message,
        "results": results,
        "scores": score_summary,
    }
