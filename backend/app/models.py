from __future__ import annotations

from datetime import UTC, date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class Observation(Base):
    __tablename__ = "observations"
    __table_args__ = (
        UniqueConstraint("indicator_id", "period_date", name="uq_observation_indicator_period"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    indicator_id: Mapped[str] = mapped_column(String(64), index=True)
    period_date: Mapped[date] = mapped_column(Date, index=True)
    effective_date: Mapped[date] = mapped_column(Date, index=True)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    is_estimate: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    source: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    meta: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class ComponentScore(Base):
    __tablename__ = "component_scores"
    __table_args__ = (
        UniqueConstraint("score_date", "indicator_id", name="uq_component_score_date_indicator"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    score_date: Mapped[date] = mapped_column(Date, index=True)
    indicator_id: Mapped[str] = mapped_column(String(64), index=True)
    raw_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    percentile: Mapped[float | None] = mapped_column(Float, nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    window_years_used: Mapped[float | None] = mapped_column(Float, nullable=True)
    observations_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    effective_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    quality: Mapped[str] = mapped_column(String(32), default="ok", nullable=False)
    meta: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


class CategoryScore(Base):
    __tablename__ = "category_scores"
    __table_args__ = (
        UniqueConstraint("score_date", "category", name="uq_category_score_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    score_date: Mapped[date] = mapped_column(Date, index=True)
    category: Mapped[str] = mapped_column(String(32), index=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    coverage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    components: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


class CompositeScore(Base):
    __tablename__ = "composite_scores"

    score_date: Mapped[date] = mapped_column(Date, primary_key=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    classification: Mapped[str] = mapped_column(String(32), default="unavailable", nullable=False)
    coverage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    confidence: Mapped[str] = mapped_column(String(16), default="low", nullable=False)
    categories: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    components: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    explanation: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    weights_hash: Mapped[str] = mapped_column(String(32), default="", nullable=False)
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class IngestRun(Base):
    __tablename__ = "ingest_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="running", nullable=False)
    message: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    results: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
