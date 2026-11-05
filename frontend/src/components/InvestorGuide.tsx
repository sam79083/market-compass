import { LOCALE_TEXT } from "../i18n";
import type { LocaleKey } from "../i18n";

interface InvestorGuideProps {
  locale: LocaleKey;
  onClose?: () => void;
}

const bands = [
  { min: 0, max: 20, label: "Very Overvalued", color: "#e06c75" },
  { min: 20, max: 40, label: "Overvalued", color: "#e39a5c" },
  { min: 40, max: 60, label: "Neutral", color: "#d8c07a" },
  { min: 60, max: 80, label: "Undervalued", color: "#6fcfb2" },
  { min: 80, max: 100, label: "Very Undervalued", color: "#4fb98a" },
];

const indicatorGuideData = [
  {
    id: "cape",
    name: "Shiller CAPE Ratio",
    what: "The S&P 500 price divided by the average of 10 years of inflation-adjusted earnings.",
    simple: "If CAPE is 40, you pay $40 for every $1 of annual earnings. Historically, CAPE above 30 often means lower future returns. Below 20 often means higher future returns.",
    when: "High -> consider dollar-cost averaging. Low -> good time to invest.",
    analogy: "Like a rental house: $600,000 house with $1,200/month rent (50x) vs. $2,400/month rent (25x). The second is a better deal.",
  },
  {
    id: "forward_pe",
    name: "Forward P/E",
    what: "Price divided by what analysts expect companies to earn next 12 months.",
    simple: "A forward P/E of 25 means for every $25 you pay, $1 of expected future earnings. Above 25 = optimistic pricing. Below 18 = potentially cheap.",
    when: "Rising forward P/E = prices getting expensive or earnings falling. Watch the trend.",
    analogy: "Guessing what a lemonade stand will earn next summer, not what it earned last summer.",
  },
  {
    id: "buffett",
    name: "Buffett Indicator",
    what: "U.S. stock market value divided by U.S. GDP.",
    simple: "Buffett's favorite metric. Above 200% = very overvalued. Around 100-150% = moderate. Below 80% = potentially undervalued.",
    when: "Above 200% -> very cautious. Below 80% -> potentially good to invest.",
    analogy: "If the country produces $25 trillion but the stock market is worth $50 trillion -- that's the market worth more than the country.",
  },
  {
    id: "erp",
    name: "Equity Risk Premium",
    what: "Extra return for buying stocks instead of safe government bonds.",
    simple: "If bonds pay 4% and stocks earn 3.5%, you're getting LESS for MORE risk. Positive ERP (3-4%) = stocks offer reasonable compensation.",
    when: "ERP above 3% -> stocks cheap vs bonds. Below 0% -> bonds pay more. Bonds may be better right now.",
    analogy: "$10,000 in bonds = $400/year guaranteed. Stocks = $350/year with swings. Where's the upside?",
  },
  {
    id: "fear_greed",
    name: "Fear & Greed",
    what: "Are investors scared (0-40) or greedy (60-100)?",
    simple: "Classic: be fearful when others are greedy, greedy when others are fearful. Below 20 = historically buying opportunity.",
    when: "Below 20 (Extreme Fear) -> historically a buying opportunity. Above 80 (Extreme Greed) -> very risky.",
    analogy: "Beach storms. Everyone runs from water during storms -- but the best swimmers know this is when to take a refreshing dip.",
  },
  {
    id: "vix",
    name: "VIX (Volatility Index)",
    what: "Options traders' expectation of S&P 500 fluctuation over next 30 days.",
    simple: "The 'fear gauge.' Below 20 = calm. Above 30 = fear. Above 40 often coincides with market bottoms.",
    when: "VIX below 15 = complacency. Above 30 = fear is high. Historically buying when VIX high produces strong returns.",
    analogy: "VIX 10 = sunny days. VIX 40 = hurricane warning. If wrong, early buyers win big.",
  },
  {
    id: "rsi",
    name: "RSI (14-day)",
    what: "14-day speedometer of how fast and hard the market has been moving.",
    simple: "Above 70 = overbought (might pause). Below 30 = oversold (might bounce). These are conventions, not guarantees.",
    when: "Below 30 = short-term oversold. Above 70 = short-term overbought. During strong trends, it can stay at extremes.",
    analogy: "A rubber band. The more it's stretched one way, the more likely it is to snap back.",
  },
  {
    id: "ma200_deviation",
    name: "vs 200-day Average",
    what: "How far above or below the S&P 500 is from its 200-day average.",
    simple: "Above +20% = overextended. Below -20% = potentially undervalued. Between -10% and +10% = near fair value.",
    when: "Above +20% = caution. Below -20% = potential opportunity.",
    analogy: "If the house above the block average is $50k more, maybe the whole neighborhood got overinflated.",
  },
  {
    id: "breadth_200dma",
    name: "Market Breadth",
    what: "What percentage of S&P 500 stocks are above their own 200-day average.",
    simple: "If only 30% of stocks are above average, the rally is narrow and fragile. If 70%+ are above, the market is broadly healthy.",
    when: "Below 25% = narrow. Above 75% = broad strength. Divergence warns of weakness.",
    analogy: "At a party, if only the DJ is having fun, the party is failing -- even if the music is loud.",
  },
  {
    id: "ew_cw_relative",
    name: "Equal-weight vs Cap-weight",
    what: "How RSP (equal-weight) is doing vs SPY (cap-weight).",
    simple: "When RSP outperforms SPY = mid and small companies are doing well too = broad market strength. When only mega-caps = concentrate caution.",
    when: "RSP outperforming -> broad health. SPY significantly outpacing -> be cautious.",
    analogy: "In a class, if only the valedictorian is doing well but everyone else falls behind, the test might be unfair for the average student.",
  },
];

export function InvestorGuide({ locale, onClose }: InvestorGuideProps) {
  const t = LOCALE_TEXT[locale];
  const guide = (t as any).glossary || {};

  return (
    <section className="panel investor-guide-panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">For new investors</div>
          <h2>{t.investor_guide_title}</h2>
          <p className="panel-sub">{t.investor_guide_intro}</p>
        </div>
        {onClose && (
          <button className="ghost-button" onClick={onClose}>Close</button>
        )}
      </div>

      {/* Scoring bands */}
      <div className="guide-section">
        <h3>{t.investor_guide_scoring_bands}</h3>
        <div className="guide-bands-table">
          {bands.map((band) => {
            const bandKey = (["very_overvalued", "overvalued", "neutral", "undervalued", "very_undervalued"] as const)[bands.indexOf(band)];
            const bt = (t.investor_guide_bands_table as any)?.[bandKey];
            return (
              <div key={bandKey} className="guide-band-row" style={{ borderLeftColor: band.color }}>
                <div className="guide-band-label">
                  <span
                    className="guide-band-swatch"
                    style={{ background: band.color }}
                  />
                  <strong>{band.min}–{band.max}</strong> · {band.label}
                </div>
                {bt && (
                  <p className="guide-band-advice" style={{ color: band.color }}>
                    {bt.advice}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Indicator explanations */}
      <div className="guide-section">
        <h3>{t.investor_guide_indicators}</h3>
        <div className="guide-indicator-grid">
          {indicatorGuideData.map((ig) => (
            <div className="guide-indicator-card" key={ig.id}>
              <h4 style={{ color: "#6fcfb2" }}>{ig.name}</h4>
              <p className="guide-card-what"><strong>What:</strong> {ig.what}</p>
              <p className="guide-card-simple"><strong>In plain English:</strong> {ig.simple}</p>
              <p className="guide-card-action"><strong>What to do:</strong> {ig.when}</p>
              <p className="guide-card-analogy"><strong>Analogy:</strong> {ig.analogy}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Key principles */}
      <div className="guide-section">
        <h3>{t.investor_guide_principles}</h3>
        <div className="guide-principles-list">
          <div className="guide-principle">
            <h4>📊 {t.investor_guide_principle_no_indicator_pure.title}</h4>
            <p>{t.investor_guide_principle_no_indicator_pure.text}</p>
          </div>
          <div className="guide-principle">
            <h4>⏰ {t.investor_guide_principle_time_matters.title}</h4>
            <p>{t.investor_guide_principle_time_matters.text}</p>
          </div>
          <div className="guide-principle">
            <h4>📈 {t.investor_guide_principle_dca_beats_timing.title}</h4>
            <p>{t.investor_guide_principle_dca_beats_timing.text}</p>
          </div>
          <div className="guide-principle">
            <h4>🛡️ {t.investor_guide_principle_diversify.title}</h4>
            <p>{t.investor_guide_principle_diversify.text}</p>
          </div>
          <div className="guide-principle">
            <h4>⚠️ {t.investor_guide_principle_past_not_future.title}</h4>
            <p>{t.investor_guide_principle_past_not_future.text}</p>
          </div>
        </div>
      </div>

      {/* Glossary */}
      <div className="guide-section">
        <h3>{t.investor_guide_glossary}</h3>
        <div className="guide-glossary-grid">
          {(Object.entries(guide) as [string, string][]).map(([key, text]) => (
            <div className="guide-glossary-item" key={key}>
              <strong>{key}</strong>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
