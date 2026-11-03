import { useEffect, useMemo, useState } from "react";
import { indicatorChartOption } from "../charts";
import { useIndicatorHistory } from "../hooks";
import type { Indicator, IndicatorHistory, RangeKey, ThemeMode } from "../types";
import {
  categoryColor,
  filterByRange,
  formatDate,
  formatNumber,
  formatScore,
  hexToRgba,
  qualityLabels,
  scoreColor,
  statusColor,
  statusLabel,
} from "../utils";
import { Chart } from "./Chart";

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: "1y", label: "1Y" },
  { key: "3y", label: "3Y" },
  { key: "5y", label: "5Y" },
  { key: "10y", label: "10Y" },
  { key: "max", label: "Max" },
];

interface IndicatorModalProps {
  indicator: Indicator;
  theme: ThemeMode;
  onClose: () => void;
}

export function IndicatorModal({ indicator, theme, onClose }: IndicatorModalProps) {
  const [range, setRange] = useState<RangeKey>("10y");
  const history = useIndicatorHistory(indicator.id, "max", true);
  const score = indicator.score?.score ?? null;
  const color = scoreColor(score);
  const accent = categoryColor(indicator.category);
  const quality = qualityLabels(indicator.score?.quality);

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
    return indicatorChartOption(sliced, indicator, theme);
  }, [history.data, filteredPoints, indicator, theme]);

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
              {indicator.section_label} · {indicator.category_label}
            </div>
            <h2 id="indicator-modal-title">{indicator.name}</h2>
            <div className="modal-subhead">
              <span className="status-chip" style={{ borderColor: hexToRgba(statusColor(indicator.status), 0.35) }}>
                <i className="status-dot" style={{ background: statusColor(indicator.status) }} />
                {statusLabel(indicator.status)}
              </span>
              <span>{indicator.frequency}</span>
              <span>{indicator.source_name}</span>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close details">
            ×
          </button>
        </header>

        {indicator.pending_estimate && indicator.latest?.is_estimate && (
          <div className="callout callout-warn">
            The newest published observation is preliminary and excluded from scores. The scored
            value is {indicator.scored?.display ?? "—"} as of {formatDate(indicator.scored?.date)}.
          </div>
        )}

        <div className="indicator-detail-grid">
          <div className="indicator-chart-panel">
            <div className="chart-toolbar">
              <div className="range-buttons" role="group" aria-label="Chart range">
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
              <span className="chart-caption">
                {history.data?.available_from ? `History from ${formatDate(history.data.available_from)}` : ""}
              </span>
            </div>
            {indicator.latest ? (
              history.loading ? (
                <div className="chart-skeleton chart-skeleton-large" />
              ) : history.error ? (
                <div className="chart-empty">Could not load history: {history.error}</div>
              ) : chartOption ? (
                <Chart
                  option={chartOption}
                  height={330}
                  ariaLabel={`${indicator.name} historical chart`}
                />
              ) : (
                <div className="chart-empty">No observations in this range.</div>
              )
            ) : (
              <div className="chart-empty chart-empty-feed">
                <strong>Authorized feed required</strong>
                <span>{indicator.unavailable_reason ?? "This indicator is not configured."}</span>
              </div>
            )}
          </div>

          <aside className="indicator-facts">
            <div className="fact-score" style={{ color }}>
              <span className="fact-score-number">{formatScore(score)}</span>
              <span className="fact-score-label">out of 100</span>
            </div>
            <div className="fact-list">
              <div>
                <span>Latest value</span>
                <strong>{indicator.latest?.display ?? "—"}</strong>
              </div>
              <div>
                <span>Latest date</span>
                <strong>{formatDate(indicator.latest?.date)}</strong>
              </div>
              <div>
                <span>Scored date</span>
                <strong>{formatDate(indicator.scored?.date ?? indicator.score?.score_date)}</strong>
              </div>
              <div>
                <span>Percentile</span>
                <strong>
                  {indicator.score?.percentile !== null && indicator.score?.percentile !== undefined
                    ? `${Math.round(indicator.score.percentile)}th`
                    : "Direct scale"}
                </strong>
              </div>
              <div>
                <span>Window used</span>
                <strong>
                  {indicator.score?.window_years_used !== null && indicator.score?.window_years_used !== undefined
                    ? `${formatNumber(indicator.score.window_years_used, 1)} years`
                    : "—"}
                </strong>
              </div>
              <div>
                <span>Observations</span>
                <strong>{indicator.score?.observations_used ?? "—"}</strong>
              </div>
              <div>
                <span>Category weight</span>
                <strong>{Math.round(indicator.weight * 100)}%</strong>
              </div>
              <div>
                <span>Quality</span>
                <strong>{quality.length > 0 ? quality.join(", ") : "OK"}</strong>
              </div>
            </div>
            {indicator.supplementary && (
              <div className="callout">Supplementary evidence. This indicator carries zero weight in the composite.</div>
            )}
            {indicator.status_message && (
              <div className="callout callout-muted">{indicator.status_message}</div>
            )}
          </aside>
        </div>

        <div className="indicator-notes">
          <section>
            <h3>What it measures</h3>
            <p>{indicator.description}</p>
          </section>
          <section>
            <h3>Method</h3>
            <p>{indicator.methodology}</p>
          </section>
          <section>
            <h3>Limitations</h3>
            <p>{indicator.limitations}</p>
          </section>
          {indicator.source_url && (
            <section>
              <h3>Source</h3>
              <a href={indicator.source_url} target="_blank" rel="noreferrer">
                {indicator.source_name} ↗
              </a>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
