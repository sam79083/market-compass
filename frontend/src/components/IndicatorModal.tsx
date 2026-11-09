import { useEffect, useMemo, useState } from "react";
import { frequencyLabel, indicatorChartOption } from "../charts";
import type { IndexKey } from "../api";
import { useIndicatorHistory } from "../hooks";
import { LOCALE_TEXT } from "../i18n";
import type { LocaleKey } from "../i18n";
import type { Indicator, IndicatorHistory, RangeKey, ThemeMode } from "../types";
import {
  categoryColor,
  filterByRange,
  formatDate,
  formatNumber,
  hexToRgba,
  statusColor,
  statusLabel,
} from "../utils";
import { Chart } from "./Chart";

interface IndicatorModalProps {
  indicator: Indicator;
  theme: ThemeMode;
  locale: LocaleKey;
  index: IndexKey;
  onClose: () => void;
}

export function IndicatorModal({ indicator, theme, locale, index, onClose }: IndicatorModalProps) {
  const [range, setRange] = useState<RangeKey>("10y");
  const history = useIndicatorHistory(indicator.id, "max", true, index);
  const text = LOCALE_TEXT[locale];
  const localized = text.indicatorLocales[indicator.id];
  const accent = categoryColor(indicator.category);

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

  const filteredPoints = useMemo(() => {
    if (!history.data) return [];
    return filterByRange(history.data.points, history.data.available_to, range);
  }, [history.data, range]);

  const chartOption = useMemo(() => {
    if (!history.data || filteredPoints.length === 0) return null;
    const sliced: IndicatorHistory = { ...history.data, points: filteredPoints };
    return indicatorChartOption(sliced, indicator, theme, locale);
  }, [history.data, filteredPoints, indicator, theme, locale]);

  const sectionLabel =
    text.section_labels[indicator.section as keyof typeof text.section_labels] ??
    indicator.section_label;
  const categoryLabel =
    text.category_labels[indicator.category as keyof typeof text.category_labels] ??
    indicator.category_label;
  const status = statusLabel(indicator.status, locale);
  const frequency = frequencyLabel(indicator.frequency, locale);
  const sourceName = localized?.source ?? indicator.source_name;
  const unavailableReason =
    indicator.unavailable_reason ??
    (locale === "kr" ? text.indicator_modal.not_configured_default : indicator.unavailable_reason);

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal indicator-modal" role="dialog" aria-modal="true" aria-labelledby="indicator-modal-title">
        <header className="modal-head">
          <div>
            <div className="eyebrow" style={{ color: accent }}>
              {sectionLabel} · {categoryLabel}
            </div>
            <h2 id="indicator-modal-title">{localized?.name ?? indicator.name}</h2>
            <div className="modal-subhead">
              <span className="status-chip" style={{ borderColor: hexToRgba(statusColor(indicator.status), 0.35) }}>
                <i className="status-dot" style={{ background: statusColor(indicator.status) }} />
                {status}
              </span>
              <span>{frequency}</span>
              <span>{sourceName}</span>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={text.close_aria}>
            ×
          </button>
        </header>

        {indicator.pending_estimate && indicator.latest?.is_estimate && (
          <div className="callout callout-warn">
            {text.indicator_modal.pending_callout_prefix}{" "}
            {indicator.scored?.display ?? "—"}{" "}
            {text.indicator_modal.pending_callout_suffix}{" "}
            {formatDate(indicator.scored?.date, locale)}.
          </div>
        )}

        <div className="indicator-detail-grid">
          <div className="indicator-chart-panel">
            <div className="chart-toolbar">
              <div className="range-buttons" role="group" aria-label={locale === "kr" ? "차트 기간" : "Chart range"}>
                {RANGES.map((item) => (
                  <button
                    key={item.key}
                    className={range === item.key ? "range-button is-active" : "range-button"}
                    onClick={() => setRange(item.key)}
                  >
                    {item.key === "max" ? text.max_range : item.label}
                  </button>
                ))}
              </div>
              <span className="chart-caption">
                {history.data?.available_from
                  ? text.indicator_modal.history_from(formatDate(history.data.available_from, locale))
                  : ""}
              </span>
            </div>
            {indicator.latest ? (
              history.loading ? (
                <div className="chart-skeleton chart-skeleton-large" />
              ) : history.error ? (
                <div className="chart-empty">
                  {text.indicator_modal.could_not_load_history} {history.error}
                </div>
              ) : chartOption ? (
                <Chart
                  option={chartOption}
                  height={330}
                  ariaLabel={`${localized?.name ?? indicator.name} ${
                    locale === "kr" ? "과거 차트" : "historical chart"
                  }`}
                />
              ) : (
                <div className="chart-empty">{text.indicator_modal.no_observations_range}</div>
              )
            ) : (
              <div className="chart-empty chart-empty-feed">
                <strong>{text.indicator_modal.authorized_feed_required}</strong>
                <span>{unavailableReason ?? text.indicator_modal.not_configured_default}</span>
              </div>
            )}
          </div>

          <aside className="indicator-facts">
            <div className="fact-list">

              <div>
                <span>{text.indicator_modal.fact_latest_value}</span>
                <strong>{indicator.latest?.display ?? "—"}</strong>
              </div>
              <div>
                <span>{text.indicator_modal.fact_latest_date}</span>
                <strong>{formatDate(indicator.latest?.date, locale)}</strong>
              </div>
              <div>
                <span>{text.indicator_modal.fact_percentile}</span>
                <strong>
                  {indicator.score?.percentile !== null && indicator.score?.percentile !== undefined
                    ? text.percentile_th(Math.round(indicator.score.percentile))
                    : text.direct_scale_word}
                </strong>
              </div>
              <div>
                <span>{text.indicator_modal.fact_window}</span>
                <strong>
                  {indicator.score?.window_years_used !== null && indicator.score?.window_years_used !== undefined
                    ? `${formatNumber(indicator.score.window_years_used, 1)}${text.years_suffix}`
                    : "—"}
                </strong>
              </div>
            </div>
            {indicator.status_message && (
              <div className="callout callout-muted">{indicator.status_message}</div>
            )}
          </aside>
        </div>

        <div className="indicator-notes">
          <section>
            <h3>{text.indicator_modal.what_it_measures}</h3>
            <p>{localized?.description ?? indicator.description}</p>
          </section>
          <section>
            <h3>{text.indicator_modal.what_method}</h3>
            <p>{localized?.methodology ?? indicator.methodology}</p>
          </section>
          <section>
            <h3>{text.indicator_modal.what_limitations}</h3>
            <p>{localized?.limitations ?? indicator.limitations}</p>
          </section>
          {indicator.source_url && (
            <section>
              <h3>{text.indicator_modal.what_source}</h3>
              <a href={indicator.source_url} target="_blank" rel="noreferrer">
                {sourceName} ↗
              </a>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: "1y", label: "1Y" },
  { key: "3y", label: "3Y" },
  { key: "5y", label: "5Y" },
  { key: "10y", label: "10Y" },
  { key: "max", label: "Max" },
];
