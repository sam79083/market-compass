from __future__ import annotations

import calendar
import html as html_module
import logging
import re
import warnings
from datetime import date, timedelta
from io import BytesIO
from urllib.parse import urljoin

import pandas as pd

from app.config import Settings
from app.ingestion.base import SeriesResult, SourceError, make_frame
from app.ingestion.fetch import HttpClient

logger = logging.getLogger(__name__)


def _month_end(year: int, month: int) -> date:
    return date(year, month, calendar.monthrange(year, month)[1])


def _resolve_url(settings: Settings, client: HttpClient) -> str:
    try:
        page = client.get_text(settings.shiller_index_url)
        matches = re.findall(r'href=["\']([^"\']*ie_data\.xls[^"\']*)["\']', page)
        if matches:
            candidate = html_module.unescape(matches[0])
            if candidate.startswith("//"):
                candidate = "https:" + candidate
            return urljoin(settings.shiller_index_url, candidate)
    except Exception as exc:
        logger.warning("could not discover Shiller workbook URL: %s", exc)
    return settings.shiller_fallback_url


def fetch_shiller(settings: Settings, client: HttpClient) -> dict[str, SeriesResult]:
    url = _resolve_url(settings, client)
    try:
        payload = client.get_bytes(url)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            frame = pd.read_excel(BytesIO(payload), sheet_name="Data", header=None, engine="xlrd")
    except Exception as exc:
        raise SourceError(f"could not read Shiller workbook: {exc}") from exc

    header_index = None
    for index in range(min(20, len(frame))):
        row = frame.iloc[index]
        if str(row.iloc[0]).strip() == "Date" and str(row.iloc[1]).strip() == "P":
            header_index = index
            break
    if header_index is None:
        raise SourceError("Shiller workbook header row not found")

    cape_rows: list[dict] = []
    earnings_rows: list[dict] = []
    cpi_rows: list[dict] = []
    for _, row in frame.iloc[header_index + 1 :].iterrows():
        fraction = pd.to_numeric(row.iloc[5], errors="coerce")
        if pd.isna(fraction):
            continue
        year = int(fraction)
        month = int(round((float(fraction) - year) * 12 + 0.5))
        if not 1 <= month <= 12:
            continue
        period = _month_end(year, month)
        cape = pd.to_numeric(row.iloc[12], errors="coerce")
        price = pd.to_numeric(row.iloc[1], errors="coerce")
        earnings = pd.to_numeric(row.iloc[3], errors="coerce")
        if pd.notna(cape) and float(cape) > 0:
            cape_rows.append(
                {
                    "period_date": period,
                    "effective_date": period
                    + timedelta(days=settings.weights.availability_lag("cape")),
                    "value": float(cape),
                    "is_estimate": False,
                    "source": "Robert Shiller / shillerdata.com",
                    "meta": {
                        "price": float(price) if pd.notna(price) else None,
                        "earnings": float(earnings) if pd.notna(earnings) else None,
                    },
                }
            )
        if pd.notna(price) and pd.notna(earnings) and float(price) > 0 and float(earnings) > 0:
            earnings_rows.append(
                {
                    "period_date": period,
                    "effective_date": period + timedelta(days=60),
                    "value": float(earnings) / float(price) * 100.0,
                    "is_estimate": False,
                    "source": "Robert Shiller / shillerdata.com",
                    "meta": {"earnings": float(earnings), "price": float(price)},
                }
            )
        cpi = pd.to_numeric(row.iloc[4], errors="coerce")
        if pd.notna(cpi) and float(cpi) > 0:
            cpi_rows.append(
                {
                    "period_date": period,
                    "effective_date": period + timedelta(days=30),
                    "value": float(cpi),
                    "is_estimate": False,
                    "source": "Robert Shiller / shillerdata.com",
                    "meta": {"definition": "CPI-U, Shiller workbook"},
                }
            )

    if len(cape_rows) < 100:
        raise SourceError(f"Shiller workbook returned too few CAPE rows ({len(cape_rows)})")
    latest_period = max(row["period_date"] for row in cape_rows)
    for row in cape_rows:
        if row["period_date"] == latest_period:
            row["is_estimate"] = True
    for row in cpi_rows:
        if row["period_date"] == latest_period:
            row["is_estimate"] = True

    cape_frame = make_frame(cape_rows)
    earnings_frame = make_frame(earnings_rows)
    cpi_frame = make_frame(cpi_rows)
    return {
        "cape": SeriesResult(
            indicator_id="cape",
            status="ok",
            observations=cape_frame,
            source="Robert Shiller / shillerdata.com",
            message=f"Loaded {len(cape_frame)} monthly CAPE observations from {url}",
        ),
        "earnings_yield": SeriesResult(
            indicator_id="earnings_yield",
            status="ok" if not earnings_frame.empty else "error",
            observations=earnings_frame,
            source="Robert Shiller / shillerdata.com",
            message=f"Loaded {len(earnings_frame)} trailing earnings-yield observations",
        ),
        "cpi": SeriesResult(
            indicator_id="cpi",
            status="ok" if not cpi_frame.empty else "error",
            observations=cpi_frame,
            source="Robert Shiller / shillerdata.com",
            message=f"Loaded {len(cpi_frame)} CPI observations",
        ),
    }
