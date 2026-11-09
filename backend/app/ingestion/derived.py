from __future__ import annotations

from datetime import date

import numpy as np
import pandas as pd

from app.ingestion.base import make_frame


def compute_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    values = pd.to_numeric(close, errors="coerce").astype(float)
    delta = values.diff()
    gains = delta.clip(lower=0).to_numpy()
    losses = (-delta.clip(upper=0)).to_numpy()
    n = len(values)
    avg_gain = np.full(n, np.nan)
    avg_loss = np.full(n, np.nan)
    if n <= period:
        return pd.Series(avg_gain, index=values.index, name="rsi")
    avg_gain[period] = np.nanmean(gains[1 : period + 1])
    avg_loss[period] = np.nanmean(losses[1 : period + 1])
    for index in range(period + 1, n):
        avg_gain[index] = (avg_gain[index - 1] * (period - 1) + gains[index]) / period
        avg_loss[index] = (avg_loss[index - 1] * (period - 1) + losses[index]) / period
    rs = np.divide(avg_gain, avg_loss, out=np.full(n, np.nan), where=avg_loss != 0)
    rsi = 100.0 - 100.0 / (1.0 + rs)
    both_zero = (avg_gain == 0) & (avg_loss == 0)
    only_gain = (avg_loss == 0) & (avg_gain > 0)
    only_loss = (avg_gain == 0) & (avg_loss > 0)
    rsi[both_zero] = 50.0
    rsi[only_gain] = 100.0
    rsi[only_loss] = 0.0
    return pd.Series(rsi, index=values.index, name="rsi")


def compute_ma200(close: pd.Series) -> pd.DataFrame:
    values = pd.to_numeric(close, errors="coerce").astype(float)
    ma = values.rolling(200, min_periods=200).mean()
    deviation = (values / ma - 1.0) * 100.0
    return pd.DataFrame({"price": values, "ma200": ma, "deviation": deviation})


def compute_ew_cw(rsp: pd.DataFrame, spy: pd.DataFrame) -> pd.DataFrame:
    left = rsp[["date", "adjclose"]].rename(columns={"adjclose": "rsp"})
    right = spy[["date", "adjclose"]].rename(columns={"adjclose": "spy"})
    merged = left.merge(right, on="date", how="inner").sort_values("date").reset_index(drop=True)
    merged = merged[(merged["rsp"] > 0) & (merged["spy"] > 0)]
    if merged.empty:
        return pd.DataFrame(columns=["date", "ratio", "rsp_norm", "spy_norm", "rel_252d"])
    first_rsp = float(merged["rsp"].iloc[0])
    first_spy = float(merged["spy"].iloc[0])
    merged["rsp_norm"] = merged["rsp"] / first_rsp * 100.0
    merged["spy_norm"] = merged["spy"] / first_spy * 100.0
    merged["ratio"] = merged["rsp"] / merged["spy"]
    merged["rel_252d"] = merged["ratio"].pct_change(252) * 100.0
    return merged[["date", "ratio", "rsp_norm", "spy_norm", "rel_252d"]]


def _earnings_yield_series(
    earnings_yield: pd.DataFrame,
    forward_pe: pd.DataFrame | None,
    method: str,
) -> tuple[pd.DataFrame, str]:
    if method == "forward":
        if forward_pe is None or forward_pe.empty:
            raise ValueError("forward ERP requested but no forward P/E observations are available")
        frame = forward_pe[["period_date", "effective_date", "value"]].copy()
        frame["earnings_yield"] = 100.0 / pd.to_numeric(frame["value"], errors="coerce")
        frame = frame.dropna(subset=["earnings_yield"])
        return frame[["period_date", "effective_date", "earnings_yield"]], "forward"
    frame = earnings_yield[["period_date", "effective_date", "value"]].copy()
    frame = frame.rename(columns={"value": "earnings_yield"})
    return frame, "trailing_proxy"


def compute_erp(
    earnings_yield: pd.DataFrame,
    treasury_10y: pd.DataFrame,
    forward_pe: pd.DataFrame | None = None,
    method: str = "auto",
    max_earnings_staleness_days: int = 200,
) -> tuple[pd.DataFrame, str]:
    use_forward = method == "forward"
    if method == "auto":
        if forward_pe is not None and not forward_pe.empty:
            latest_forward = pd.to_datetime(forward_pe["effective_date"]).max().date()
            recent = (date.today() - latest_forward).days <= 120
            use_forward = recent and len(forward_pe) >= 12
    if method == "forward" and (forward_pe is None or forward_pe.empty):
        raise ValueError("forward ERP requested but no forward P/E observations are available")
    earnings, resolved_method = _earnings_yield_series(
        earnings_yield, forward_pe, "forward" if use_forward else "trailing"
    )
    if earnings.empty or treasury_10y.empty:
        return pd.DataFrame(columns=["period_date", "effective_date", "value"]), resolved_method

    earnings = earnings.copy()
    earnings["effective_date"] = pd.to_datetime(earnings["effective_date"])
    treasury = treasury_10y[["period_date", "value"]].copy()
    treasury["period_date"] = pd.to_datetime(treasury["period_date"])
    treasury = treasury.rename(
        columns={"period_date": "treasury_date", "value": "treasury_yield"}
    )
    treasury = treasury.sort_values("treasury_date")
    earnings = earnings.rename(
        columns={
            "period_date": "earnings_period_date",
            "effective_date": "earnings_effective_date",
        }
    ).sort_values("earnings_effective_date")
    merged = pd.merge_asof(
        treasury,
        earnings,
        left_on="treasury_date",
        right_on="earnings_effective_date",
        direction="backward",
    )
    merged = merged.dropna(subset=["treasury_yield", "earnings_yield"])
    merged["earnings_age_days"] = (
        merged["treasury_date"] - merged["earnings_effective_date"]
    ).dt.days
    merged = merged[merged["earnings_age_days"] <= max_earnings_staleness_days]
    merged["value"] = merged["earnings_yield"] - merged["treasury_yield"]
    merged["period_date"] = merged["treasury_date"]
    merged["effective_date"] = merged["treasury_date"]
    return merged, resolved_method


def compute_nasdaq_erp(pe: pd.DataFrame, treasury_10y: pd.DataFrame) -> pd.DataFrame:
    """NASDAQ-100 equity risk premium: trailing earnings yield (100 / P/E) minus the 10Y yield.

    Each P/E snapshot is paired with the latest Treasury yield on or before its date.
    Returns columns period_date, effective_date, value, earnings_yield, treasury_yield, pe.
    """
    empty = pd.DataFrame(
        columns=["period_date", "effective_date", "value", "earnings_yield", "treasury_yield", "pe"]
    )
    if pe is None or pe.empty or treasury_10y is None or treasury_10y.empty:
        return empty
    left = pe[["period_date", "effective_date", "value"]].rename(columns={"value": "pe"}).copy()
    left["pe"] = pd.to_numeric(left["pe"], errors="coerce")
    left = left[left["pe"] > 0].copy()
    left["effective_date"] = pd.to_datetime(left["effective_date"])
    left["period_date"] = pd.to_datetime(left["period_date"])
    left = left.sort_values("effective_date")
    right = treasury_10y[["period_date", "value"]].rename(
        columns={"period_date": "treasury_date", "value": "treasury_yield"}
    )
    right["treasury_date"] = pd.to_datetime(right["treasury_date"])
    right = right.sort_values("treasury_date")
    merged = pd.merge_asof(
        left,
        right,
        left_on="effective_date",
        right_on="treasury_date",
        direction="backward",
        tolerance=pd.Timedelta(days=10),
    ).dropna(subset=["treasury_yield", "pe"])
    if merged.empty:
        return empty
    merged["earnings_yield"] = 100.0 / merged["pe"]
    merged["value"] = merged["earnings_yield"] - merged["treasury_yield"]
    return merged[
        ["period_date", "effective_date", "value", "earnings_yield", "treasury_yield", "pe"]
    ]


def nasdaq_erp_observations(erp_frame: pd.DataFrame) -> pd.DataFrame:
    rows = [
        {
            "period_date": row.period_date.date(),
            "effective_date": row.effective_date.date(),
            "value": float(row.value),
            "is_estimate": False,
            "source": "NASDAQ-100 trailing earnings yield - 10Y Treasury",
            "meta": {
                "earnings_yield": float(row.earnings_yield),
                "treasury_yield": float(row.treasury_yield),
                "pe": float(row.pe),
                "method": "trailing_proxy",
                "earnings_effective_date": row.effective_date.date().isoformat(),
            },
        }
        for row in erp_frame.itertuples()
    ]
    return make_frame(rows)


def rsi_observations(price_frame: pd.DataFrame, source: str) -> pd.DataFrame:
    working = price_frame[["date", "close"]].copy().sort_values("date")
    working["value"] = compute_rsi(working["close"])
    working = working.dropna(subset=["value"])
    rows = [
        {
            "period_date": row.date,
            "effective_date": row.date,
            "value": float(row.value),
            "is_estimate": False,
            "source": source,
            "meta": {"price": float(row.close)},
        }
        for row in working.itertuples()
    ]
    return make_frame(rows)


def ma200_observations(price_frame: pd.DataFrame, source: str) -> pd.DataFrame:
    working = price_frame[["date", "close"]].copy().sort_values("date")
    metrics = compute_ma200(working["close"])
    working = working.join(metrics)
    working["ma200_slope_20d"] = (working["ma200"] / working["ma200"].shift(20) - 1.0) * 100.0
    working = working.dropna(subset=["deviation", "ma200"])
    rows = [
        {
            "period_date": row.date,
            "effective_date": row.date,
            "value": float(row.deviation),
            "is_estimate": False,
            "source": source,
            "meta": {
                "price": float(row.price),
                "ma200": float(row.ma200),
                "ma200_slope_20d": (
                    float(row.ma200_slope_20d) if pd.notna(row.ma200_slope_20d) else None
                ),
            },
        }
        for row in working.itertuples()
    ]
    return make_frame(rows)


def ew_cw_observations(relative_frame: pd.DataFrame, source: str) -> pd.DataFrame:
    rows = []
    for row in relative_frame.itertuples():
        rows.append(
            {
                "period_date": row.date,
                "effective_date": row.date,
                "value": float(row.ratio),
                "is_estimate": False,
                "source": source,
                "meta": {
                    "rsp_norm": float(row.rsp_norm),
                    "spy_norm": float(row.spy_norm),
                    "rel_252d": float(row.rel_252d) if pd.notna(row.rel_252d) else None,
                },
            }
        )
    return make_frame(rows)


def erp_observations(erp_frame: pd.DataFrame, method: str) -> pd.DataFrame:
    rows = []
    for row in erp_frame.itertuples():
        rows.append(
            {
                "period_date": row.period_date.date(),
                "effective_date": row.effective_date.date(),
                "value": float(row.value),
                "is_estimate": False,
                "source": (
                    "Forward earnings yield - 10Y Treasury"
                    if method == "forward"
                    else "Shiller trailing earnings yield - 10Y Treasury"
                ),
                "meta": {
                    "earnings_yield": float(row.earnings_yield),
                    "treasury_yield": float(row.treasury_yield),
                    "method": method,
                    "earnings_effective_date": row.earnings_effective_date.date().isoformat(),
                },
            }
        )
    return make_frame(rows)
