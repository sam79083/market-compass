import { useCallback, useEffect, useMemo, useState } from "react";
import { dataSourceLabel, fetchCompositeHistory, fetchDashboard } from "./api";
import { compositeChartOption } from "./charts";
import { CategoryStrip } from "./components/CategoryStrip";
import { Chart } from "./components/Chart";
import { IndicatorCard } from "./components/IndicatorCard";
import { IndicatorModal } from "./components/IndicatorModal";
import { MethodologyModal } from "./components/MethodologyModal";
import { ScoreDial } from "./components/ScoreDial";
import { SignalCard } from "./components/SignalCard";
import { EmptyState, ErrorState, LoadingSkeleton } from "./components/States";
import type { CompositeHistory, Dashboard, Indicator, RangeKey, ThemeMode } from "./types";
import {
  filterByRange,
  formatDate,
  formatDateTime,
  formatNumber,
  formatScore,
  scoreColor,
  statusColor,
  titleCase,
} from "./utils";

const THEME_KEY = "market-compass-theme";
const COMPOSITE_RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: "1y", label: "1Y" },
  { key: "3y", label: "3Y" },
  { key: "5y", label: "5Y" },
  { key: "10y", label: "10Y" },
  { key: "max", label: "Max" },
];
const SECTION_ORDER = ["valuation", "sentiment", "breadth"];

function readTheme(): ThemeMode {
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === "light" ? "light" : "dark";
}

function trendColor(label: string): string {
  if (label === "Bullish") return "#6fcfb2";
  if (label === "Bearish") return "#e06c75";
  return "#d8c07a";
}

function runStatusColor(status: string): string {
  if (status === "success") return statusColor("fresh");
  if (status === "partial") return statusColor("stale");
  if (status === "failed") return "#e06c75";
  return statusColor("unknown");
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(readTheme);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compositeHistory, setCompositeHistory] = useState<CompositeHistory | null>(null);
  const [compositeError, setCompositeError] = useState<string | null>(null);
  const [compositeRange, setCompositeRange] = useState<RangeKey>("max");
  const [selected, setSelected] = useState<Indicator | null>(null);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const loadDashboard = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchDashboard(controller.signal)
      .then((payload) => {
        if (controller.signal.aborted) return;
        setDashboard(payload);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "The API request failed.");
        setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const cleanup = loadDashboard();
    return cleanup;
  }, [loadDashboard]);

  useEffect(() => {
    if (!dashboard?.has_data) {
      setCompositeHistory(null);
      return;
    }
    const controller = new AbortController();
    setCompositeError(null);
    fetchCompositeHistory("max", controller.signal)
      .then((payload) => {
        if (!controller.signal.aborted) setCompositeHistory(payload);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setCompositeError(reason instanceof Error ? reason.message : "Could not load history.");
        }
      });
    return () => controller.abort();
  }, [dashboard?.generated_at, dashboard?.has_data]);

  const indicatorNames = useMemo(
    () =>
      Object.fromEntries(
        (dashboard?.indicators ?? []).map((indicator) => [indicator.id, indicator.short_name]),
      ),
    [dashboard],
  );

  const compositePoints = useMemo(
    () =>
      compositeHistory
        ? filterByRange(compositeHistory.points, compositeHistory.available_to, compositeRange)
        : [],
    [compositeHistory, compositeRange],
  );

  const compositeOption = useMemo(
    () =>
      compositePoints.length > 0 && dashboard
        ? compositeChartOption(compositePoints, dashboard.bands, theme, indicatorNames)
        : null,
    [compositePoints, dashboard, theme, indicatorNames],
  );

  const groupedIndicators = useMemo(() => {
    if (!dashboard) return [];
    return SECTION_ORDER.map((section) => {
      const indicators = dashboard.indicators.filter((indicator) => indicator.section === section);
      return {
        section,
        label: indicators[0]?.section_label ?? titleCase(section),
        indicators,
      };
    }).filter((group) => group.indicators.length > 0);
  }, [dashboard]);

  const headerStatus = dashboard?.freshness.last_run_status ?? "unknown";

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" role="presentation">
              <path d="M4 29 L13 18 L21 23 L35 8" />
              <circle cx="35" cy="8" r="3" />
            </svg>
          </div>
          <div>
            <div className="brand-name">Market Compass</div>
            <div className="brand-tag">U.S. equity valuation, in context</div>
          </div>
        </div>
        <div className="header-actions">
          {dashboard && (
            <div className="header-status" title={dashboard.freshness.last_run_message}>
              <span className="status-dot" style={{ background: runStatusColor(headerStatus) }} />
              <span className="header-status-label">{headerStatus}</span>
              <span className="header-sep" />
              <span>As of {formatDate(dashboard.as_of)}</span>
            </div>
          )}
          <button className="ghost-button" onClick={() => setMethodologyOpen(true)}>
            Methodology
          </button>
          <button
            className="theme-button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </header>

      <main>
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={loadDashboard} />
        ) : dashboard && !dashboard.has_data ? (
          <EmptyState />
        ) : dashboard ? (
          <>
            <section className="hero-grid">
              <div className="panel score-panel">
                <div className="panel-head">
                  <div>
                    <div className="eyebrow">Composite reading</div>
                    <h1>Where the market stands</h1>
                  </div>
                  <span className="as-of">As of {formatDate(dashboard.as_of)}</span>
                </div>
                <ScoreDial overall={dashboard.overall} bands={dashboard.bands} theme={theme} />
                <div className="score-panel-foot">
                  <span>Latest data {formatDate(dashboard.latest_data)}</span>
                  <span>Refreshed {formatDateTime(dashboard.freshness.last_refresh)}</span>
                </div>
              </div>

              <div className="panel narrative-panel">
                <div className="eyebrow">The read</div>
                <h2 className="narrative-headline" style={{ color: dashboard.overall.color }}>
                  {dashboard.explanation.headline}
                </h2>
                <p className="narrative-body">{dashboard.explanation.body}</p>

                <div className="signal-grid">
                  <SignalCard
                    label="Long-term valuation"
                    value={dashboard.overall.long_term.label}
                    score={dashboard.overall.long_term.score}
                    coverage={dashboard.overall.long_term.coverage}
                    color={dashboard.overall.long_term.color}
                    detail="Fundamental + relative"
                  />
                  <SignalCard
                    label="Current conditions"
                    value={dashboard.overall.conditions.label}
                    score={dashboard.overall.conditions.score}
                    coverage={dashboard.overall.conditions.coverage}
                    color={dashboard.overall.conditions.color}
                    detail="Sentiment + breadth"
                  />
                  <SignalCard
                    label="Sentiment"
                    value={dashboard.sentiment.label}
                    color="#c792ea"
                    detail={
                      dashboard.sentiment.value !== null
                        ? `${formatNumber(dashboard.sentiment.value, 0)}/100 · ${dashboard.sentiment.source}`
                        : dashboard.sentiment.note
                    }
                  />
                  <SignalCard
                    label="Trend"
                    value={dashboard.trend.label}
                    color={trendColor(dashboard.trend.label)}
                    detail={
                      dashboard.trend.available
                        ? `S&P 500 ${formatNumber(dashboard.trend.price, 0)} vs 200d ${formatNumber(
                            dashboard.trend.ma200,
                            0,
                          )} · ${formatNumber(dashboard.trend.deviation_pct, 1)}%`
                        : "Trend data unavailable"
                    }
                  />
                </div>

                {(dashboard.explanation.supporting.length > 0 ||
                  dashboard.explanation.contradicting.length > 0) && (
                  <div className="factor-grid">
                    <div>
                      <h3 className="factor-heading">{dashboard.explanation.supporting_label}</h3>
                      {dashboard.explanation.supporting.map((factor) => (
                        <div className="factor" key={factor.id}>
                          <div className="factor-top">
                            <span>{factor.short_name}</span>
                            <strong style={{ color: scoreColor(factor.score) }}>
                              {formatScore(factor.score)}
                            </strong>
                          </div>
                          <p>{factor.text}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h3 className="factor-heading">{dashboard.explanation.contradicting_label}</h3>
                      {dashboard.explanation.contradicting.map((factor) => (
                        <div className="factor" key={factor.id}>
                          <div className="factor-top">
                            <span>{factor.short_name}</span>
                            <strong style={{ color: scoreColor(factor.score) }}>
                              {formatScore(factor.score)}
                            </strong>
                          </div>
                          <p>{factor.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dashboard.explanation.conflicts.map((conflict) => (
                  <div className="callout callout-conflict" key={conflict}>
                    {conflict}
                  </div>
                ))}
              </div>
            </section>

            <CategoryStrip categories={dashboard.categories} />

            <section className="panel composite-panel" id="history">
              <div className="panel-head composite-head">
                <div>
                  <div className="eyebrow">History</div>
                  <h2>Composite score over time</h2>
                  <p className="panel-sub">
                    Higher means more attractive relative to its own history. Hover the line to
                    inspect the components behind each reading.
                  </p>
                </div>
                <div className="range-buttons" role="group" aria-label="Composite history range">
                  {COMPOSITE_RANGES.map((item) => (
                    <button
                      key={item.key}
                      className={compositeRange === item.key ? "range-button is-active" : "range-button"}
                      onClick={() => setCompositeRange(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              {compositeError ? (
                <div className="chart-empty">Could not load composite history: {compositeError}</div>
              ) : !compositeHistory ? (
                <div className="chart-skeleton chart-skeleton-large" />
              ) : compositeOption ? (
                <Chart
                  option={compositeOption}
                  height={370}
                  ariaLabel="Composite valuation score history"
                />
              ) : (
                <div className="chart-empty">No scored history is available in this range.</div>
              )}
              <div className="composite-legend">
                {dashboard.bands.map((band) => (
                  <span key={band.key}>
                    <i style={{ background: band.color }} />
                    {band.label}
                  </span>
                ))}
                <span className="legend-note">20-year rolling percentile · point-in-time</span>
              </div>
            </section>

            <section className="indicators-section" id="indicators">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">Signals</div>
                  <h2>Ten ways to read the market</h2>
                  <p className="panel-sub">
                    Each signal is scored 0–100 against its own history. Click a card for the full
                    chart, method, and limitations.
                  </p>
                </div>
                <span className="section-count">{dashboard.indicators.length} indicators</span>
              </div>
              {groupedIndicators.map((group) => (
                <div className="indicator-group" key={group.section}>
                  <div className="group-head">
                    <h3>{group.label}</h3>
                    <span>{group.indicators.length} signals</span>
                  </div>
                  <div className="indicator-grid">
                    {group.indicators.map((indicator) => (
                      <IndicatorCard
                        key={indicator.id}
                        indicator={indicator}
                        theme={theme}
                        onOpen={setSelected}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <section className="panel quality-panel">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">Data notes</div>
                  <h2>What to keep in mind</h2>
                </div>
                <button className="text-button" onClick={() => setMethodologyOpen(true)}>
                  Full methodology ↗
                </button>
              </div>
              <div className="quality-chip-row">
                {dashboard.overall.quality_flags.map((flag) => (
                  <span className="quality-chip" key={flag}>
                    {titleCase(flag)}
                  </span>
                ))}
              </div>
              <ul className="data-notes">
                {dashboard.explanation.data_notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <div className="quality-footer">
                <span>Weights hash {dashboard.weights_hash}</span>
                <span>API {dataSourceLabel}</span>
                <span>{dashboard.freshness.available}/{dashboard.freshness.total} indicators available</span>
              </div>
            </section>
          </>
        ) : null}
      </main>

      <footer className="site-footer">
        <div>
          <strong>Market Compass</strong> · A historical relative-attractiveness summary, not a
          forecast or an automated buy/sell signal.
        </div>
        <div className="footer-meta">
          <span>Point-in-time methodology</span>
          <span>Research tooling</span>
          {dashboard && <span>Weights {dashboard.weights_hash}</span>}
        </div>
      </footer>

      {selected && (
        <IndicatorModal indicator={selected} theme={theme} onClose={() => setSelected(null)} />
      )}
      {methodologyOpen && <MethodologyModal onClose={() => setMethodologyOpen(false)} />}
    </div>
  );
}
