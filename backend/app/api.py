from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.config import Settings
from app.services.dashboard import build_dashboard
from app.services.history import (
    get_composite_history,
    get_health,
    get_indicator_history,
    get_methodology,
    get_price_history,
    get_sector_history,
    get_sector_snapshot,
)

router = APIRouter(prefix="/api")

RangeKey = Literal["1y", "3y", "5y", "10y", "max"]
RangeQuery = Annotated[RangeKey, Query(alias="range")]
IndexQuery = Annotated[str, Query(alias="index", pattern="^(sp500|nasdaq)$")]


def get_session(request: Request):
    factory = request.app.state.session_factory
    session = factory()
    try:
        yield session
    finally:
        session.close()


def get_app_settings(request: Request) -> Settings:
    return request.app.state.settings


SessionDep = Annotated[Session, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_app_settings)]


@router.get("/dashboard")
def dashboard(
    session: SessionDep,
    settings: SettingsDep,
    index: IndexQuery = "sp500",
):
    return build_dashboard(session, settings, index)


@router.get("/indicators/{indicator_id}/history")
def indicator_history(
    indicator_id: str,
    session: SessionDep,
    settings: SettingsDep,
    range_key: RangeQuery = "max",
    index: IndexQuery = "sp500",
):
    try:
        return get_indicator_history(session, settings, indicator_id, range_key, index)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown indicator: {indicator_id}") from None


@router.get("/composite/history")
def composite_history(
    session: SessionDep,
    settings: SettingsDep,
    range_key: RangeQuery = "max",
    index: IndexQuery = "sp500",
):
    return get_composite_history(session, settings, range_key, index)


@router.get("/price-history")
def price_history(
    session: SessionDep,
    settings: SettingsDep,
    index: IndexQuery = "sp500",
    range_key: RangeQuery = "max",
):
    return get_price_history(session, settings, index, range_key)


@router.get("/sectors")
def sectors(session: SessionDep):
    return get_sector_snapshot(session)


@router.get("/sectors/{symbol}")
def sector_history(symbol: str, session: SessionDep):
    payload = get_sector_history(session, symbol)
    if payload is None:
        raise HTTPException(status_code=404, detail="Unknown sector symbol")
    return payload


@router.get("/methodology")
def methodology(settings: SettingsDep):
    return get_methodology(settings)


@router.get("/validation")
def validation(settings: SettingsDep):
    payload = get_methodology(settings).get("validation")
    return {"validation": payload}


@router.get("/health")
def health(session: SessionDep):
    return get_health(session)
