import { useCallback, useEffect, useState } from "react";
import { fetchDashboard } from "./api";
import type { IndexKey } from "./api";
import { AdSlot } from "./components/AdSlot";
import { DipCheck } from "./components/DipCheck";
import { DipGuide } from "./components/DipGuide";
import { IndicatorModal } from "./components/IndicatorModal";
import { PriceChart } from "./components/PriceChart";
import { EmptyState, ErrorState, LoadingSkeleton } from "./components/States";
import { SectorCheck } from "./components/SectorCheck";
import { GUIDE_TEXT } from "./dipCheck";
import { LOCALE_TEXT } from "./i18n";
import type { LocaleKey } from "./i18n";
import type { Dashboard, Indicator, ThemeMode } from "./types";
import { formatDate, statusColor } from "./utils";

const THEME_KEY = "market-compass-theme";
const LOCALE_KEY = "market-compass-locale";

function readTheme(): ThemeMode {
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === "light" ? "light" : "dark";
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
  const [selected, setSelected] = useState<Indicator | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [index, setIndex] = useState<IndexKey>("nasdaq");

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
    fetchDashboard(controller.signal, index)
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
  }, [index]);

  useEffect(() => {
    const cleanup = loadDashboard();
    return cleanup;
  }, [loadDashboard]);

  // An open indicator modal belongs to the previous index once the view switches.
  useEffect(() => {
    setSelected(null);
  }, [index]);

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
            <div className="brand-tag">{locale === "kr" ? "하락 구간 점검" : "Is this a dip? A quick check"}</div>
          </div>
        </div>
        <div className="header-actions">
          {dashboard && (
            <div className="header-status" title={dashboard.freshness.last_run_message}>
              <span className="status-dot" style={{ background: runStatusColor(headerStatus) }} />
              <span className="header-status-label">{t.header_status}</span>
              <span className="header-sep" />
              <span>{t.header_as_of} {formatDate(dashboard.as_of, locale)}</span>
            </div>
          )}
          <button className="ghost-button" onClick={() => setGuideOpen(true)}>
            {GUIDE_TEXT[locale].button}
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
          <div className="index-selector">
            <button
              className={index === "sp500" ? "index-button is-active" : "index-button"}
              onClick={() => setIndex("sp500")}
            >
              {t.index_sp500}
            </button>
            <button
              className={index === "nasdaq" ? "index-button is-active" : "index-button"}
              onClick={() => setIndex("nasdaq")}
            >
              {t.index_nasdaq}
            </button>
          </div>
        </div>
      </header>

      <main>
        {loading ? (
          <LoadingSkeleton locale={locale} />
        ) : error ? (
          <ErrorState message={error} onRetry={loadDashboard} locale={locale} />
        ) :         dashboard && !dashboard.has_data ? (
          <EmptyState locale={locale} />
        ) : dashboard ? (
          <>
            <PriceChart index={index} theme={theme} locale={locale} />
            <DipCheck dashboard={dashboard} index={index} locale={locale} onOpen={setSelected} />
            <SectorCheck locale={locale} />
            <AdSlot />
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
        <IndicatorModal
          indicator={selected}
          theme={theme}
          locale={locale}
          index={index}
          onClose={() => setSelected(null)}
        />
      )}
      {guideOpen && <DipGuide locale={locale} onClose={() => setGuideOpen(false)} />}
    </div>
  );
}
