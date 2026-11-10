import { useEffect, useMemo, useRef, useState } from "react";
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
  { key: "3m", label: "3M", days: 63 },
  { key: "6m", label: "6M", days: 130 },
  { key: "1y", label: "1Y", days: 252 },
  { key: "3y", label: "3Y", days: 756 },
  { key: "5y", label: "5Y", days: 1263 },
  { key: "max", label: "Max", days: null },
];

function zoomForRange(days: number | null, length: number): { start: number; end: number } {
  const end = Math.max(0, length - 1);
  if (days == null) return { start: 0, end };
  return { start: Math.max(0, length - days), end };
}

export function PriceChart({ index, theme, locale }: PriceChartProps) {
  const [range, setRange] = useState<string | null>("1y");
  const [customWindow, setCustomWindow] = useState<{ start: number; end: number } | null>(null);
  const [history, setHistory] = useState<PriceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ left: number; width: number } | null>(null);
  const [zoomTick, setZoomTick] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const downXRef = useRef<number | null>(null);
  const copy = TEXT[locale];

  useEffect(() => {
    const controller = new AbortController();
    setHistory(null);
    setRange("1y");
    setCustomWindow(null);
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

  const fullPoints = useMemo(() => available?.points ?? [], [available]);

  const activeWindow = useMemo(() => {
    if (customWindow) return customWindow;
    const spec = RANGES.find((item) => item.key === range) ?? RANGES[3];
    return zoomForRange(spec.days, fullPoints.length);
  }, [customWindow, range, fullPoints.length]);

  const points = useMemo(
    () => fullPoints.slice(activeWindow.start, activeWindow.end + 1),
    [fullPoints, activeWindow],
  );

  const latest = points.length > 0 ? points[points.length - 1] : null;
  const windowFirst = points.length > 1 ? points[0] : null;
  const change = latest && windowFirst ? latest.close - windowFirst.close : null;
  const changePct = change !== null && windowFirst ? (change / windowFirst.close) * 100 : null;
  const up = change !== null ? change >= 0 : true;
  const rangeLabel = range
    ? (RANGES.find((item) => item.key === range)?.label ?? RANGES[3].label)
    : locale === "kr"
      ? "구간"
      : "Custom";

  const dayPrev = fullPoints.length > 1 ? fullPoints[fullPoints.length - 2] : null;
  const dayLatest = fullPoints.length > 1 ? fullPoints[fullPoints.length - 1] : null;
  const dayChange = dayLatest && dayPrev ? dayLatest.close - dayPrev.close : null;
  const dayChangePct = dayChange !== null && dayPrev ? (dayChange / dayPrev.close) * 100 : null;

  const xToIndex = (relativeX: number) => {
    const wrap = wrapRef.current;
    const total = points.length;
    if (!wrap || total < 2) return 0;
    const rect = wrap.getBoundingClientRect();
    const plotLeft = 52;
    const plotRight = Math.max(plotLeft + 1, rect.width - 14);
    const ratio = (relativeX - plotLeft) / (plotRight - plotLeft);
    const local = Math.min(total - 1, Math.max(0, Math.round(ratio * (total - 1))));
    return activeWindow.start + local;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!option || event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    downXRef.current = x;
    setSelection({ left: x, width: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (downXRef.current === null) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const current = event.clientX - rect.left;
    setSelection({
      left: Math.min(downXRef.current, current),
      width: Math.abs(current - downXRef.current),
    });
  };

  const finishSelection = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = downXRef.current;
    downXRef.current = null;
    setSelection(null);
    if (start === null) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const end = event.clientX - rect.left;
    if (Math.abs(end - start) < 6) return;
    const i0 = xToIndex(Math.min(start, end));
    const i1 = xToIndex(Math.max(start, end));
    if (i0 >= i1) return;
    setCustomWindow({ start: i0, end: i1 });
    setRange(null);
    setZoomTick((tick) => tick + 1);
  };

  const option = useMemo(
    () => (available && points.length > 1 ? priceChartOption(available.symbol, points, theme, locale) : null),
    [available, points, theme, locale, zoomTick],
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
                <span className="price-change" title={locale === "kr" ? "차트에 표시된 기간의 변동률" : "Change over the selected period"}>
                  {rangeLabel} {up ? "+" : ""}
                  {formatNumber(changePct, 2)}% ({up ? "+" : ""}
                  {formatNumber(change, 2)})
                </span>
              )}
              {dayChange !== null && dayChangePct !== null && (
                <span className="price-sub" title={locale === "kr" ? "전일 대비 변동률" : "Change vs previous trading day"}>
                  1D {dayChangePct >= 0 ? "+" : ""}
                  {formatNumber(dayChangePct, 2)}% ({dayChange >= 0 ? "+" : ""}
                  {formatNumber(dayChange, 2)})
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
              onClick={() => {
                setRange(item.key);
                setCustomWindow(null);
              }}
            >
              {item.key === "max" ? LOCALE_TEXT[locale].max_range : item.label}
            </button>
          ))}
        </div>
      </div>
      {error && !loading ? (
        <div className="chart-empty">{error}</div>
      ) : option ? (
        <div
          className="price-chart-wrap"
          ref={wrapRef}
          onPointerDownCapture={handlePointerDown}
          onPointerMoveCapture={handlePointerMove}
          onPointerUpCapture={finishSelection}
          onPointerCancelCapture={finishSelection}
        >
          <Chart
            option={option}
            height={280}
            ariaLabel={`${available?.symbol ?? ""} ${locale === "kr" ? "가격 차트" : "price chart"}`}
          />
          {selection && (
            <div
              className="price-selection"
              style={{ left: selection.left, width: selection.width }}
            />
          )}
        </div>
      ) : (
        <div className="chart-skeleton chart-skeleton-large" />
      )}
      {available && points.length > 1 && (
        <p className="price-window">
          <span>
            {formatDate(points[0].date, locale)} – {formatDate(latest?.date ?? null, locale)}
          </span>
          <span className="price-window-hint">
            {locale === "kr" ? "차트에서 드래그하면 해당 구간으로 확대됩니다" : "Drag on the chart to zoom into a period"}
          </span>
        </p>
      )}
    </section>
  );
}
