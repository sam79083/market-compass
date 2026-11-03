import { useCallback, useEffect, useMemo, useState } from "react";
import { dataSourceLabel, fetchCompositeHistory, fetchDashboard } from "./api";
import { compositeChartOption } from "./charts";
import { AdSlot } from "./components/AdSlot";
import { CategoryStrip } from "./components/CategoryStrip";
import { Chart } from "./components/Chart";
import { IndicatorCard } from "./components/IndicatorCard";
import { IndicatorModal } from "./components/IndicatorModal";
import { MethodologyModal } from "./components/MethodologyModal";
import { ScoreDial } from "./components/ScoreDial";
import { SignalCard } from "./components/SignalCard";
import { EmptyState, ErrorState, LoadingSkeleton } from "./components/States";
import { LOCALE_TEXT } from "./i18n";
import type { LocaleKey } from "./i18n";
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
const LOCALE_KEY = "market-compass-locale";
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
  const [locale, setLocale] = useState<LocaleKey>(() => {
    const stored = window.localStorage.getItem(LOCALE_KEY);
    return stored === "en" ? "en" : "kr";
  });
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compositeHistory, setCompositeHistory] = useState<CompositeHistory | null>(null);
  const [compositeError, setCompositeError] = useState<string | null>(null);
  const [compositeRange, setCompositeRange] = useState<RangeKey>("max");
  const [selected, setSelected] = useState<Indicator | null>(null);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  const t = LOCALE_TEXT[locale];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.locale = locale;
    window.localStorage.setItem(LOCALE_KEY, locale);
  }, [locale]);

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
            <div className="brand-name">{t.default_label}</div>
            <div className="brand-tag">{t.tagline}</div>
          </div>
        </div>
        <div className="header-actions">
          {dashboard && (
            <div className="header-status" title={dashboard.freshness.last_run_message}>
              <span className="status-dot" style={{ background: runStatusColor(headerStatus) }} />
              <span className="header-status-label">{t.header_status}</span>
              <span className="header-sep" />
              <span>{t.header_as_of} {formatDate(dashboard.as_of)}</span>
            </div>
          )}
          <button className="ghost-button" onClick={() => setMethodologyOpen(true)}>
            {t.methodology_btn}
          </button>
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? t.switch_to_light : t.switch_to_dark}
            title={theme === "dark" ? t.switch_to_light : t.switch_to_dark}
          >
            <span className="theme-icon">{theme === "dark" ? "☀️" : "🌙"}</span>
            <span className="theme-label">{theme === "dark" ? t.light : t.dark}</span>
          </button>
          <button
            className="lang-toggle"
            onClick={() => setLocale(locale === "kr" ? "en" : "kr")}
            aria-label={`Switch to ${locale === "kr" ? "English" : "한국어"}`}
          >
            <span className={`lang-option ${locale === "kr" ? "lang-active" : ""}`}>KR</span>
            <span className="lang-divider" />
            <span className={`lang-option ${locale === "en" ? "lang-active" : ""}`}>EN</span>
          </button>
        </div>
      </header>

      <main>
        {loading ? (
          <LoadingSkeleton locale={locale} />
        ) : error ? (
          <ErrorState message={error} onRetry={loadDashboard} locale={locale} />
        ) : dashboard && !dashboard.has_data ? (
          <EmptyState />
        ) : dashboard ? (
          <>
            <section className="hero-grid">
              <div className="panel score-panel">
                <div className="panel-head">
                  <div>
                    <div className="eyebrow">{t.composite_reading}</div>
                    <h1>{t.where_market_stands}</h1>
                  </div>
                  <span className="as-of">{t.as_of} {formatDate(dashboard.as_of)}</span>
                </div>
                <ScoreDial overall={dashboard.overall} bands={dashboard.bands} theme={theme} />
                <div className="score-panel-foot">
                  <span>{t.latest_data} {formatDate(dashboard.latest_data)}</span>
                  <span>{t.refreshed} {formatDateTime(dashboard.freshness.last_refresh)}</span>
                </div>
              </div>

              <div className="panel narrative-panel">
                <div className="eyebrow">{t.the_read}</div>
                <h2 className="narrative-headline" style={{ color: dashboard.overall.color }}>
                  {dashboard.explanation.headline}
                </h2>
                <p className="narrative-body">{dashboard.explanation.body}</p>

                <div className="signal-grid">
                  <SignalCard
                    label={t.long_term_valuation}
                    value={dashboard.overall.long_term.label}
                    score={dashboard.overall.long_term.score}
                    coverage={dashboard.overall.long_term.coverage}
                    color={dashboard.overall.long_term.color}
                    detail={t.fundamental_relative}
                  />
                  <SignalCard
                    label={t.current_conditions}
                    value={dashboard.overall.conditions.label}
                    score={dashboard.overall.conditions.score}
                    coverage={dashboard.overall.conditions.coverage}
                    color={dashboard.overall.conditions.color}
                    detail={t.sentiment_breadth}
                  />
                  <SignalCard
                    label={t.sentiment_label}
                    value={dashboard.sentiment.label}
                    color="#c792ea"
                    detail={
                      dashboard.sentiment.value !== null
                        ? `${formatNumber(dashboard.sentiment.value, 0)}/100 · ${dashboard.sentiment.source}`
                        : dashboard.sentiment.note
                    }
                  />
                  <SignalCard
                    label={t.trend_label}
                    value={dashboard.trend.label}
                    color={trendColor(dashboard.trend.label)}
                    detail={
                      dashboard.trend.available
                        ? `S&P 500 ${formatNumber(dashboard.trend.price, 0)} vs 200d ${formatNumber(
                            dashboard.trend.ma200,
                            0,
                          )} · ${formatNumber(dashboard.trend.deviation_pct, 1)}%`
                        : t.trend_unavailable
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
                  <div className="eyebrow">{t.history_eyebrow}</div>
                  <h2>{t.composite_score_over_time}</h2>
                  <p className="panel-sub">{t.higher_means}</p>
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
                <div className="chart-empty">{t.could_not_load_composite}: {compositeError}</div>
              ) : !compositeHistory ? (
                <div className="chart-skeleton chart-skeleton-large" />
              ) : compositeOption ? (
                <Chart
                  option={compositeOption}
                  height={370}
                  ariaLabel="Composite valuation score history"
                />
              ) : (
                <div className="chart-empty">{t.no_history_range}</div>
              )}
              <div className="composite-legend">
                {dashboard.bands.map((band) => (
                  <span key={band.key}>
                    <i style={{ background: band.color }} />
                    {band.label}
                  </span>
                ))}
                <span className="legend-note">{t.legend_rolling}</span>
              </div>
            </section>

            <section className="indicators-section" id="indicators">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">{t.signals}</div>
                  <h2>{t.composite_reading}</h2>
                  <p className="panel-sub">{t.signals_sub}</p>
                </div>
                <span className="section-count">{t.indicators_count(dashboard.indicators.length)}</span>
              </div>
              {groupedIndicators.map((group) => (
                <div className="indicator-group" key={group.section}>
                  <div className="group-head">
                    <h3>{group.label}</h3>
                    <span>{t.signals_count(group.indicators.length)}</span>
                  </div>
                  <div className="indicator-grid">
                    {group.indicators.map((indicator) => (
                      <IndicatorCard
                        key={indicator.id}
                        indicator={indicator}
                        theme={theme}
                        locale={locale}
                        onOpen={setSelected}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <AdSlot />

            <section className="panel quality-panel">
              <div className="panel-head">
                <div>
                  <div className="eyebrow">{t.data_notes_eyebrow}</div>
                  <h2>{t.what_to_keep_in_mind}</h2>
                </div>
                <button className="text-button" onClick={() => setMethodologyOpen(true)}>
                  {t.full_methodology}
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
                <span>{t.footer_meta_weights} {dashboard.weights_hash}</span>
                <span>{t.footer_meta_api} {dataSourceLabel}</span>
                <span>{dashboard.freshness.available}/{dashboard.freshness.total} {t.footer_meta_available}</span>
              </div>
            </section>
          </>
        ) : null}
      </main>

      <footer className="site-footer">
        <div>
          <nav className="footer-links" aria-label="Site information">
            <a href="/about">{t.footer_links_about}</a>
            <a href="/methodology">{t.footer_links_methodology}</a>
            <a href="/faq">{t.footer_links_faq}</a>
            <a href="/privacy">{t.footer_links_privacy}</a>
            <a href="/terms">{t.footer_links_terms}</a>
          </nav>
          <div>
            <strong>{t.footer}</strong>
          </div>
        </div>
        <div className="footer-meta">
          <span>{t.footer_meta_point_in_time}</span>
          <span>{t.footer_meta_research}</span>
        </div>
      </footer>

      {selected && (
        <IndicatorModal indicator={selected} theme={theme} onClose={() => setSelected(null)} />
      )}
      {methodologyOpen && <MethodologyModal onClose={() => setMethodologyOpen(false)} />}
    </div>
  );
}
