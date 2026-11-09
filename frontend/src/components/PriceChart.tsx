import { useEffect, useMemo, useState } from "react";
import { fetchPriceHistory } from "../api";
import type { IndexKey } from "../api";
import { priceChartOption } from "../charts";
import { LOCALE_TEXT } from "../i18n";
import type { LocaleKey } from "../i18n";
import type { PriceHistory, ThemeMode } from "../types";
import { formatDate, formatNumber } from "../utils";
import { Chart } from "./Chart";

interface PriceChartProps {
  index: IndexKey;
  theme: ThemeMode;
  locale: LocaleKey;
}

const TEXT: Record<LocaleKey, { eyebrow: string; asOf: string; note: string }> = {
  en: {
    eyebrow: "Market price",
    asOf: "As of",
    note: "Daily closing prices in USD. Price return, dividends not included.",
  },
  kr: {
    eyebrow: "시장 가격",
    asOf: "기준",
    note: "미국 시장 종가 기준 (USD). 배당금 미반영, 가격수익률 기준.",
  },
};

const RANGES: Array<{ key: string; label: string; days: number | null }> = [
  { key: "1m", label: "1M", days: 22 },
  { key: "6m", label: "6M", days: 130 },
  { key: "1y", label: "1Y", days: 252 },
  { key: "5y", label: "5Y", days: 1263 },
  { key: "max", label: "Max", days: null },
];

export function PriceChart({ index, theme, locale }: PriceChartProps) {
  const [range, setRange] = useState<string>("1y");
  const [history, setHistory] = useState<PriceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const copy = TEXT[locale];

  useEffect(() => {
    const controller = new AbortController();
    setHistory(null);
    setRange("1y");
    setLoading(true);
    setError(null);
    fetchPriceHistory(controller.signal, index)
      .then((payload) => {
        if (controller.signal.aborted) return;
        setHistory(payload);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Could not load price history");
        setLoading(false);
      });
    return () => controller.abort();
  }, [index]);

  const available = !loading && !error && history && history.points.length > 0 ? history : null;

  const points = useMemo(() => {
    if (!available) return [];
    const spec = RANGES.find((item) => item.key === range) ?? RANGES[2];
    if (spec.days === null) return available.points;
    return available.points.slice(-spec.days);
  }, [available, range]);

  const latest = points.length > 0 ? points[points.length - 1] : null;
  const previous = points.length > 1 ? points[points.length - 2] : null;
  const change = latest && previous ? latest.close - previous.close : null;
  const changePct = change !== null && previous ? (change / previous.close) * 100 : null;
  const up = change !== null ? change >= 0 : true;

  const yearWindow = available ? available.points.slice(-252) : [];
  const yearlyChange =
    yearWindow.length > 1
      ? ((yearWindow[yearWindow.length - 1].close - yearWindow[0].close) / yearWindow[0].close) * 100
      : null;

  const option = useMemo(
    () => (available && points.length > 1 ? priceChartOption(available.symbol, points, theme, locale) : null),
    [available, points, theme, locale],
  );

  return (
    <section className="panel price-panel" id="price-chart" aria-busy={loading}>
      <div className="panel-head">
        <div>
          <div className="eyebrow">{copy.eyebrow}</div>
          <div className="price-symbol-line">
            <span className="price-symbol">{available ? available.symbol : "—"}</span>
            <span className="price-name">{available ? available.name : ""}</span>
          </div>
          {available && points.length > 1 && (
            <div className="price-stats" data-up={up}>
              {latest && <span className="price-last">${formatNumber(latest.close, 2)}</span>}
              {change !== null && changePct !== null && (
                <span className="price-change">
                  {up ? "+" : ""}
                  {formatNumber(changePct, 2)}% ({up ? "+" : ""}
                  {formatNumber(change, 2)})
                </span>
              )}
              {yearlyChange !== null && (
                <span className="price-sub">
                  1Y {yearlyChange >= 0 ? "+" : ""}
                  {formatNumber(yearlyChange, 1)}%
                </span>
              )}
            </div>
          )}
          <p className="panel-sub">
            {copy.asOf} {formatDate(latest?.date ?? null, locale)}
            {available ? ` · ${copy.note}` : ""}
          </p>
        </div>
        <div className="range-buttons" role="group" aria-label={locale === "kr" ? "차트 기간" : "Chart range"}>
          {RANGES.map((item) => (
            <button
              key={item.key}
              className={range === item.key ? "range-button is-active" : "range-button"}
              onClick={() => setRange(item.key)}
            >
              {item.key === "max" ? LOCALE_TEXT[locale].max_range : item.label}
            </button>
          ))}
        </div>
      </div>
      {error && !loading ? (
        <div className="chart-empty">{error}</div>
      ) : option ? (
        <Chart
          option={option}
          height={280}
          ariaLabel={`${available?.symbol ?? ""} ${locale === "kr" ? "가격 차트" : "price chart"}`}
        />
      ) : (
        <div className="chart-skeleton chart-skeleton-large" />
      )}
    </section>
  );
}
