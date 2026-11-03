from __future__ import annotations

from datetime import date

import numpy as np
import pandas as pd


def percentile_rank(values, current: float) -> float | None:
    array = np.asarray([value for value in values if value is not None and np.isfinite(value)], dtype=float)
    if array.size == 0 or not np.isfinite(current):
        return None
    less = float(np.sum(array < current))
    equal = float(np.sum(array == current))
    return (less + 0.5 * equal) / array.size * 100.0


def component_history(
    observations: pd.DataFrame,
    indicator_id: str,
    transform: str,
    score_dates: list[date],
    window_years: int,
    min_observations: int,
    staleness_days: int,
    score_value_column: str | None = None,
    quality_tags: tuple[str, ...] = (),
) -> pd.DataFrame:
    columns = [
        "score_date",
        "indicator_id",
        "raw_value",
        "percentile",
        "score",
        "window_years_used",
        "observations_used",
        "effective_date",
        "quality",
        "meta",
    ]
    if observations is None or observations.empty:
        return pd.DataFrame(columns=columns)

    frame = observations.copy()
    frame = frame[~frame["is_estimate"].fillna(False).astype(bool)]
    frame["period_ts"] = pd.to_datetime(frame["period_date"])
    frame["effective_ts"] = pd.to_datetime(frame["effective_date"])
    frame["score_value"] = (
        pd.to_numeric(frame[score_value_column], errors="coerce")
        if score_value_column
        else pd.to_numeric(frame["value"], errors="coerce")
    )
    frame = frame.dropna(subset=["score_value", "period_ts", "effective_ts"])
    if frame.empty:
        return pd.DataFrame(columns=columns)
    frame = frame.sort_values(["effective_ts", "period_ts"]).reset_index(drop=True)

    rows = []
    for score_date in score_dates:
        score_ts = pd.Timestamp(score_date)
        eligible = frame[frame["effective_ts"] <= score_ts]
        if eligible.empty:
            continue
        latest = eligible.iloc[-1]
        age_days = (score_ts - latest["effective_ts"]).days
        if age_days > staleness_days:
            continue

        if transform == "inverse_level":
            raw = float(latest["score_value"])
            score = 100.0 - float(np.clip(raw, 0.0, 100.0))
            rows.append(
                {
                    "score_date": score_date,
                    "indicator_id": indicator_id,
                    "raw_value": raw,
                    "percentile": None,
                    "score": score,
                    "window_years_used": None,
                    "observations_used": 1,
                    "effective_date": latest["effective_ts"].date(),
                    "quality": ",".join(("direct_scale",) + quality_tags),
                    "meta": {
                        "transform": transform,
                        "latest_period_date": latest["period_ts"].date().isoformat(),
                        "display_value": float(latest["value"]),
                    },
                }
            )
            continue

        window_start = score_ts - pd.Timedelta(days=round(window_years * 365.25))
        window = eligible[eligible["period_ts"] >= window_start]
        window = window.dropna(subset=["score_value"])
        if len(window) < min_observations:
            continue
        raw = float(latest["score_value"])
        percentile = percentile_rank(window["score_value"].tolist(), raw)
        if percentile is None:
            continue
        score = 100.0 - percentile if transform == "inverse_percentile" else percentile
        span_days = (latest["period_ts"] - window["period_ts"].min()).days
        window_used = round(span_days / 365.25, 2)
        tags = list(quality_tags)
        if window_used < window_years - 1:
            tags.append("short_window")
        rows.append(
            {
                "score_date": score_date,
                "indicator_id": indicator_id,
                "raw_value": raw,
                "percentile": round(float(percentile), 4),
                "score": round(float(score), 4),
                "window_years_used": window_used,
                "observations_used": int(len(window)),
                "effective_date": latest["effective_ts"].date(),
                "quality": ",".join(tags) if tags else "ok",
                "meta": {
                    "transform": transform,
                    "latest_period_date": latest["period_ts"].date().isoformat(),
                    "display_value": float(latest["value"]),
                    "window_start": window_start.date().isoformat(),
                    "window_end": score_date.isoformat(),
                },
            }
        )
    return pd.DataFrame(rows, columns=columns)


def expanding_component_for_date(
    observations: pd.DataFrame,
    indicator_id: str,
    transform: str,
    score_date: date,
    window_years: int,
    min_observations: int,
    staleness_days: int,
    score_value_column: str | None = None,
    quality_tags: tuple[str, ...] = (),
) -> dict | None:
    frame = component_history(
        observations,
        indicator_id,
        transform,
        [score_date],
        window_years,
        min_observations,
        staleness_days,
        score_value_column,
        quality_tags,
    )
    if frame.empty:
        return None
    return frame.iloc[0].to_dict()


def latest_observation(
    observations: pd.DataFrame,
    score_date: date,
    staleness_days: int,
    include_estimates: bool = False,
) -> dict | None:
    if observations is None or observations.empty:
        return None
    frame = observations.copy()
    if not include_estimates:
        frame = frame[~frame["is_estimate"].fillna(False).astype(bool)]
    frame["effective_ts"] = pd.to_datetime(frame["effective_date"])
    frame["period_ts"] = pd.to_datetime(frame["period_date"])
    frame = frame[frame["effective_ts"] <= pd.Timestamp(score_date)]
    if frame.empty:
        return None
    frame = frame.sort_values(["effective_ts", "period_ts"])
    row = frame.iloc[-1]
    age_days = (pd.Timestamp(score_date) - row["effective_ts"]).days
    meta = row["meta"] if isinstance(row["meta"], dict) else {}
    return {
        "period_date": row["period_ts"].date(),
        "effective_date": row["effective_ts"].date(),
        "value": float(row["value"]),
        "is_estimate": bool(row["is_estimate"]),
        "source": row.get("source", ""),
        "age_days": int(age_days),
        "stale": age_days > staleness_days,
        "meta": meta,
    }


def score_dates_from_prices(price_dates: list[date], start_year: int, latest: date | None = None) -> list[date]:
    if not price_dates:
        return []
    dates = sorted(day for day in price_dates if day.year >= start_year)
    if not dates:
        return []
    series = pd.Series(dates, dtype="datetime64[ns]")
    frame = pd.DataFrame({"date": series})
    frame["year"] = frame["date"].dt.year
    frame["month"] = frame["date"].dt.month
    monthly = frame.groupby(["year", "month"], sort=True)["date"].max().dt.date.tolist()
    if latest is None:
        latest = dates[-1]
    if monthly and monthly[-1] != latest:
        monthly.append(latest)
    return sorted(set(monthly))

