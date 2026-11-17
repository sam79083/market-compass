import { useEffect, useMemo, useState } from "react";
import { sectorChartOption } from "../charts";
import { useEtfHoldings, useSectorHistory } from "../hooks";
import { LOCALE_TEXT } from "../i18n";
import type { LocaleKey } from "../i18n";
import type { EtfHoldingsPayload, ThemeMode } from "../types";
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
    holdingsTitle: string;
    holdingsCount: (count: number) => string;
    holdingsTotal: (total: number) => string;
    holdingsSource: string;
    holdingsLoading: string;
    holdingsError: string;
    holdingsNone: string;
    noHoldingsFor: Record<string, string>;
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
    holdingsTitle: "Portfolio",
    holdingsCount: (count) => `Top ${count} holdings · % of net assets`,
    holdingsTotal: (total) => `Top ${formatNumber(total, 1)}% combined`,
    holdingsSource: "Yahoo Finance (unofficial). Weights can drift between rebalances.",
    holdingsLoading: "Loading holdings…",
    holdingsError: "Could not load holdings.",
    holdingsNone: "No holdings reported in the feed for this ETF.",
    noHoldingsFor: {
      GLD: "Holds physical gold bullion — no stock portfolio to list.",
      TLT: "Holds long-term U.S. Treasury bonds — no stock portfolio to list.",
    },
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
    holdingsTitle: "포트폴리오",
    holdingsCount: (count) => `상위 ${count}개 종목 · 순자산 대비 비중`,
    holdingsTotal: (total) => `상위 종목 합계 ${formatNumber(total, 1)}%`,
    holdingsSource: "Yahoo Finance(비공식) 기준. 편입 비중은 리밸런싱 사이에 달라질 수 있습니다.",
    holdingsLoading: "구성 종목을 불러오는 중…",
    holdingsError: "구성 종목을 불러오지 못했습니다.",
    holdingsNone: "피드에 구성 종목이 보고되지 않았습니다.",
    noHoldingsFor: {
      GLD: "실물 금을 보유하는 ETF입니다. 구성 종목이 없습니다.",
      TLT: "미국 장기 국채를 보유하는 ETF입니다. 구성 종목이 없습니다.",
    },
  },
};

function HoldingsSection({
  symbol,
  copy,
  payload,
  loading,
  error,
  locale,
}: {
  symbol: string;
  copy: (typeof TEXT)[LocaleKey];
  payload: EtfHoldingsPayload | null;
  loading: boolean;
  error: string | null;
  locale: LocaleKey;
}) {
  const entry = payload?.etfs[symbol];
  const holdings = entry?.holdings ?? [];
  const maxWeight = holdings.reduce((acc, item) => Math.max(acc, item.weight), 0);
  const total = holdings.reduce((acc, item) => acc + item.weight, 0);
  const sourceDate = payload?.generated_at?.slice(0, 10) ?? null;

  return (
    <div className="sector-holdings">
      <div className="sector-holdings-head">
        <h3 className="sector-holdings-title">{copy.holdingsTitle}</h3>
        {holdings.length > 0 && (
          <span className="sector-holdings-meta">
            {copy.holdingsCount(holdings.length)}
            {sourceDate ? ` · ${formatDate(sourceDate, locale)}` : ""}
          </span>
        )}
      </div>
      {loading ? (
        <p className="sector-holdings-note">{copy.holdingsLoading}</p>
      ) : error ? (
        <p className="sector-holdings-note">{copy.holdingsError} {error}</p>
      ) : holdings.length > 0 ? (
        <>
          <ol className="sector-holdings-list">
            {holdings.map((item) => (
              <li key={item.symbol ?? item.name} className="sector-holdings-row">
                <span className="sector-holdings-symbol">{item.symbol ?? "—"}</span>
                <span className="sector-holdings-name" title={item.name}>{item.name}</span>
                <span className="sector-holdings-bar" aria-hidden="true">
                  <i style={{ width: maxWeight > 0 ? `${(item.weight / maxWeight) * 100}%` : "0%" }} />
                </span>
                <span className="sector-holdings-weight">{formatNumber(item.weight, 1)}%</span>
              </li>
            ))}
          </ol>
          <p className="sector-holdings-foot">
            <span>{copy.holdingsTotal(total)}</span>
            <span>{copy.holdingsSource}</span>
          </p>
        </>
      ) : (
        <p className="sector-holdings-note">{copy.noHoldingsFor[symbol] ?? copy.holdingsNone}</p>
      )}
    </div>
  );
}

export function SectorModal({ symbol, displayName, theme, locale, onClose }: SectorModalProps) {
  const [range, setRange] = useState<string>("1y");
  const history = useSectorHistory(symbol);
  const holdings = useEtfHoldings();
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

        <HoldingsSection
          symbol={symbol}
          copy={copy}
          payload={holdings.data}
          loading={holdings.loading}
          error={holdings.error}
          locale={locale}
        />

        <p className="sector-modal-note">{copy.note}</p>
      </div>
    </div>
  );
}
