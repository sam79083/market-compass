import { LOCALE_TEXT } from "../i18n";
import type { LocaleKey } from "../i18n";

interface InvestorGuideProps {
  locale: LocaleKey;
  onClose?: () => void;
}

const BAND_COLORS: Record<string, string> = {
  very_overvalued: "#e06c75",
  overvalued: "#e39a5c",
  neutral: "#d8c07a",
  undervalued: "#6fcfb2",
  very_undervalued: "#4fb98a",
};

const BAND_ORDER = ["very_overvalued", "overvalued", "neutral", "undervalued", "very_undervalued"] as const;

export function InvestorGuide({ locale, onClose }: InvestorGuideProps) {
  const text = LOCALE_TEXT[locale];
  const guideLabels = text.guide_labels;

  return (
    <section className="panel investor-guide-panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">{guideLabels.eyebrow}</div>
          <h2>{text.investor_guide_title}</h2>
          <p className="panel-sub">{text.investor_guide_intro}</p>
        </div>
        {onClose && (
          <button className="ghost-button" onClick={onClose} aria-label={text.close_aria}>
            {locale === "kr" ? "닫기" : "Close"}
          </button>
        )}
      </div>

      {/*
       * Scoring bands
       */}
      <div className="guide-section">
        <h3>{text.investor_guide_scoring_bands}</h3>
        <div className="guide-bands-table">
          {BAND_ORDER.map((bandKey) => {
            const band = text.investor_guide_bands_table[bandKey];
            const color = BAND_COLORS[bandKey];
            return (
              <div key={bandKey} className="guide-band-row" style={{ borderLeftColor: color }}>
                <div className="guide-band-label">
                  <span className="guide-band-swatch" style={{ background: color }} />
                  <strong>{band.label}</strong>
                </div>
                <p className="guide-band-advice" style={{ color }}>
                  {band.advice}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/*
       * Indicator explanations
       */}
      <div className="guide-section">
        <h3>{text.investor_guide_indicators}</h3>
        <div className="guide-indicator-grid">
          {text.guide_indicators.map((indicator) => (
            <div className="guide-indicator-card" key={indicator.id}>
              <h4 style={{ color: BAND_COLORS.undervalued }}>{indicator.name}</h4>
              <p className="guide-card-what">
                <strong>{guideLabels.what}</strong> {indicator.what}
              </p>
              <p className="guide-card-simple">
                <strong>{guideLabels.simple}</strong> {indicator.simple}
              </p>
              <p className="guide-card-action">
                <strong>{guideLabels.action}</strong> {indicator.when}
              </p>
              <p className="guide-card-analogy">
                <strong>{guideLabels.analogy}</strong> {indicator.analogy}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/*
       * Key principles
       */}
      <div className="guide-section">
        <h3>{text.investor_guide_principles}</h3>
        <div className="guide-principles-list">
          <div className="guide-principle">
            <h4>🎯 {text.investor_guide_principle_no_indicator_pure.title}</h4>
            <p>{text.investor_guide_principle_no_indicator_pure.text}</p>
          </div>
          <div className="guide-principle">
            <h4>⏰ {text.investor_guide_principle_time_matters.title}</h4>
            <p>{text.investor_guide_principle_time_matters.text}</p>
          </div>
          <div className="guide-principle">
            <h4>📅 {text.investor_guide_principle_dca_beats_timing.title}</h4>
            <p>{text.investor_guide_principle_dca_beats_timing.text}</p>
          </div>
          <div className="guide-principle">
            <h4>🛡️ {text.investor_guide_principle_diversify.title}</h4>
            <p>{text.investor_guide_principle_diversify.text}</p>
          </div>
          <div className="guide-principle">
            <h4>⚠️ {text.investor_guide_principle_past_not_future.title}</h4>
            <p>{text.investor_guide_principle_past_not_future.text}</p>
          </div>
        </div>
      </div>

      {/*
       * Glossary
       */}
      <div className="guide-section">
        <h3>{text.investor_guide_glossary}</h3>
        <div className="guide-glossary-grid">
          {(Object.entries(text.glossary) as Array<[string, string]>).map(([key, explanation]) => (
            <div className="guide-glossary-item" key={key}>
              <strong>{glossaryKeyLabel(locale, key)}</strong>
              <p>{explanation}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const GLOSSARY_LABELS: Record<string, { kr: string; en: string }> = {
  cape: { kr: "CAPE", en: "CAPE" },
  pe: { kr: "P/E", en: "P/E" },
  erp: { kr: "ERP", en: "ERP" },
  vix: { kr: "VIX", en: "VIX" },
  market_cap: { kr: "시가총액", en: "Market cap" },
  dollar_cost_average: { kr: "적립식 투자", en: "Dollar-cost averaging" },
  volatility: { kr: "변동성", en: "Volatility" },
  mean_reversion: { kr: "평균 회귀", en: "Mean reversion" },
};

function glossaryKeyLabel(locale: LocaleKey, key: string): string {
  return GLOSSARY_LABELS[key]?.[locale] ?? key;
}
