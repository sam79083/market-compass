"""Per-index access to stored scores.

The S&P 500 composite lives in the database (written by ``refresh_scores``). The NASDAQ
composite is derived from NASDAQ-specific series, so it is computed from stored observations
on demand and cached until the observations change. This keeps the database schema unchanged.
"""

from __future__ import annotations

from typing import Any

import pandas as pd
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import ComponentScore, CompositeScore, Observation
from app.scoring.engine import build_score_tables, indicators_for, load_observations


def _float_or_none(value: Any) -> float | None:
    return float(value) if value is not None and pd.notna(value) else None


class DbScores:
    """Scores stored in the database (the S&P 500 view)."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def composites(self) -> list[CompositeScore]:
        return list(
            self.session.execute(select(CompositeScore).order_by(CompositeScore.score_date))
            .scalars()
            .all()
        )

    def latest_composite(self) -> CompositeScore | None:
        return self.session.execute(
            select(CompositeScore).order_by(desc(CompositeScore.score_date)).limit(1)
        ).scalar_one_or_none()

    def latest_component(self, indicator_id: str) -> ComponentScore | None:
        return self.session.execute(
            select(ComponentScore)
            .where(ComponentScore.indicator_id == indicator_id)
            .order_by(desc(ComponentScore.score_date))
            .limit(1)
        ).scalar_one_or_none()


class MemoryScores:
    """Scores computed in memory (the NASDAQ view). Objects are transient, never persisted."""

    def __init__(
        self,
        composites: list[CompositeScore],
        latest_components: dict[str, ComponentScore],
    ) -> None:
        self._composites = composites
        self._latest_components = latest_components

    def composites(self) -> list[CompositeScore]:
        return list(self._composites)

    def latest_composite(self) -> CompositeScore | None:
        return self._composites[-1] if self._composites else None

    def latest_component(self, indicator_id: str) -> ComponentScore | None:
        return self._latest_components.get(indicator_id)


_CACHE: dict[tuple, MemoryScores] = {}


def _fingerprint(session: Session, settings: Settings, index: str) -> tuple:
    count, max_id = session.execute(
        select(func.count(Observation.id), func.max(Observation.id))
    ).one()
    database = session.get_bind().url.render_as_string(hide_password=True)
    weights_hash = settings.weights.for_index(index).hash
    return (database, index, weights_hash, int(count or 0), int(max_id or 0))


def _compute(session: Session, settings: Settings, index: str) -> MemoryScores:
    observations = load_observations(session)
    components, composite_rows = build_score_tables(observations, settings, index)

    composites = [
        CompositeScore(
            score_date=row["score_date"],
            score=row.get("score"),
            classification=row.get("classification", "unavailable"),
            coverage=float(row.get("coverage", 0.0)),
            confidence=row.get("confidence", "low"),
            categories=row.get("categories", {}),
            components=row.get("components", {}),
            explanation=row.get("explanation", {}),
            weights_hash=row.get("weights_hash", ""),
        )
        for row in composite_rows
    ]

    latest: dict[str, ComponentScore] = {}
    if components is not None and not components.empty:
        for row in components.sort_values("score_date").itertuples():
            latest[str(row.indicator_id)] = ComponentScore(
                score_date=row.score_date,
                indicator_id=row.indicator_id,
                raw_value=_float_or_none(row.raw_value),
                percentile=_float_or_none(row.percentile),
                score=_float_or_none(row.score),
                window_years_used=_float_or_none(row.window_years_used),
                observations_used=(
                    int(row.observations_used) if pd.notna(row.observations_used) else None
                ),
                effective_date=row.effective_date,
                quality=row.quality,
                meta=row.meta,
            )
    return MemoryScores(composites, latest)


def score_source(session: Session, settings: Settings, index: str):
    """Return the score source for ``index`` (``sp500`` or ``nasdaq``)."""
    indicators_for(index)  # validates the index key
    if index == "sp500":
        return DbScores(session)
    key = _fingerprint(session, settings, index)
    cached = _CACHE.get(key)
    if cached is None:
        cached = _compute(session, settings, index)
        _CACHE.clear()
        _CACHE[key] = cached
    return cached
