import { useEffect, useMemo, useState } from "react";
import { sectorChartOption } from "../charts";
import { useSectorHistory } from "../hooks";
import { LOCALE_TEXT } from "../i18n";
import type { LocaleKey } from "../i18n";
import type { ThemeMode } from "../types";
import { formatDate, formatNumber } from "../utils";
import { Chart } from "./Chart";

interface SectorModalProps {
  symbol: string;
  displayName: string;
  theme: ThemeMode;
  locale: LocaleKey;
  onClose: () => void;
}

const RANGES: Array<{ key: string; label: string; days: number | null }> = [
  { key: "3m", label: "3M", days: 63 },
  { key: "6m", label: "6M", days: 126 },
  { key: "1y", label: "1Y", days: 252 },
  { key: "2y", label: "2Y", days: null },
];

const TEXT: Record<
  LocaleKey,
  {
    eyebrow: string;
    price: string;
    ma200: string;
    rsi: string;
    asOf: string;
    note: string;
    rangeAria: string;
    chartAria: string;
    noData: string;
    loadError: string;
  }
> = {
  en: {
    eyebrow: "Sector chart",
    price: "Price",
    ma200: "200-day",
    rsi: "RSI(14)",
    asOf: "As of",
    note: "Daily closes in USD, price return (dividends not included). Dashed line is the 200-day average. The lower panel is RSI(14) with the 30 and 70 reference lines.",
    rangeAria: "Chart range",
    chartAria: "price and RSI chart",
    noData: "No history available for this ETF yet.",
    loadError: "Could not load history.",
  },
  kr: {
    eyebrow: "부문 차트",
    price: "현재가",
    ma200: "200일선",
    rsi: "RSI(14)",
    asOf: "기준",
    note: "미국 시장 종가 기준 (USD), 배당금 미반영 가격수익률입니다. 점선은 200일 이동평균, 아래 패널은 RSI(14)이며 30과 70 기준선이 표시됩니다.",
    rangeAria: "차트 기간",
    chartAria: "가격 및 RSI 차트",
    noData: "이 ETF의 과거 데이터가 아직 없습니다.",
    loadError: "과거 데이터를 불러오지 못했습니다.",
  },
};

export function SectorModal({ symbol, displayName, theme, locale, onClose }: SectorModalProps) {
  const [range, setRange] = useState<string>("1y");
  const history = useSectorHistory(symbol);
  const copy = TEXT[locale];

  useEffect(() => {
    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const allPoints = history.data?.points ?? [];

  const points = useMemo(() => {
    const spec = RANGES.find((item) => item.key === range) ?? RANGES[2];
    if (spec.days === null) return allPoints;
    return allPoints.slice(-spec.days);
  }, [allPoints, range]);

  const option = useMemo(
    () => (points.length > 1 ? sectorChartOption(symbol, points, theme, locale) : null),
    [symbol, points, theme, locale],
  );

  const latest = allPoints.length > 0 ? allPoints[allPoints.length - 1] : null;

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal sector-modal" role="dialog" aria-modal="true" aria-labelledby="sector-modal-title">
        <header className="modal-head">
          <div>
            <div className="eyebrow">{copy.eyebrow}</div>
            <h2 id="sector-modal-title">
              {symbol} <span className="sector-modal-name">{displayName}</span>
            </h2>
            {latest && (
              <div className="modal-subhead sector-modal-stats">
                <span>
                  {copy.price} <strong>${formatNumber(latest.close, 2)}</strong>
                </span>
                {latest.ma200 !== null && (
                  <span>
                    {copy.ma200} ${formatNumber(latest.ma200, 2)}
                  </span>
                )}
                <span>
                  {copy.rsi} {formatNumber(latest.rsi, 1)}
                </span>
                <span>
                  {copy.asOf} {formatDate(latest.date, locale)}
                </span>
              </div>
            )}
          </div>
          <button className="icon-button" onClick={onClose} aria-label={LOCALE_TEXT[locale].close_aria}>
            ×
          </button>
        </header>

        <div className="chart-toolbar">
          <div className="range-buttons" role="group" aria-label={copy.rangeAria}>
            {RANGES.map((item) => (
              <button
                key={item.key}
                className={range === item.key ? "range-button is-active" : "range-button"}
                onClick={() => setRange(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {history.loading ? (
          <div className="chart-skeleton chart-skeleton-large" />
        ) : history.error ? (
          <div className="chart-empty">
            {copy.loadError} {history.error}
          </div>
        ) : option ? (
          <Chart option={option} height={380} ariaLabel={`${symbol} ${copy.chartAria}`} />
        ) : (
          <div className="chart-empty">{copy.noData}</div>
        )}

        <p className="sector-modal-note">{copy.note}</p>
      </div>
    </div>
  );
}
