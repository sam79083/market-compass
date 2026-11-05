// Shared locale types and text imported by App.tsx and child components.
// Kept in a separate file to avoid circular dependencies.
// NOTE: much of the payload (band keys, indicator ids, category keys) arrives
// in English from the API. Every visible string is mapped through this file
// so the Korean UI renders no English.

export type LocaleKey = "kr" | "en";
export type ComponentCategory = "fundamental" | "relative" | "sentiment" | "breadth";

const en = {
  default_label: "Market Compass",
  tagline: "U.S. equity valuation, in context",
  browse: "Browse the market",
  as_of: "As of",
  composite_reading: "Composite reading",
  signals: "Signals",
  valuation: "valuation",
  sentiment: "sentiment & momentum",
  breadth: "market breadth",
  loading: "Loading...",
  error: "Error",
  no_data: "No data",
  empty_state: "No data available",
  footer_meta_weights: "weights",
  footer_meta_api: "API",
  footer_meta_available: "indicators available",
  methodology: "Methodology",
  footer:
    "Market Compass is an informational research tool, not a forecast or an automated buy/sell signal.",
  footer_meta_point_in_time: "point-in-time methodology",
  footer_meta_research: "research tooling",
  header_status: "Last run status",
  header_status_unknown: "unknown",
  header_as_of: "As of",
  footer_links_about: "About",
  footer_links_methodology: "Methodology",
  footer_links_faq: "FAQ",
  footer_links_privacy: "Privacy",
  footer_links_terms: "Terms",
  where_market_stands: "Where the market stands",
  the_read: "The read",
  latest_data: "Latest data",
  refreshed: "Refreshed",
  history_eyebrow: "History",
  composite_score_over_time: "Composite score over time",
  higher_means:
    "Higher means more attractive relative to its own history. Hover the line to inspect the components behind each reading.",
  indicators_count: (n: number) => `${n} indicators`,
  signals_count: (n: number) => `${n} signals`,
  data_notes_eyebrow: "Data notes",
  what_to_keep_in_mind: "What to keep in mind",
  full_methodology: "Full methodology ↗",
  legend_rolling: "20-year rolling percentile · point-in-time",
  long_term_valuation: "Long-term valuation",
  current_conditions: "Current conditions",
  sentiment_label: "Sentiment",
  trend_label: "Trend",
  trend_unavailable: "Trend data unavailable",
  no_history_range: "No scored history is available in this range.",
  could_not_load_composite: "Could not load composite history",
  fundamental_relative: "Fundamental + relative",
  sentiment_breadth: "Sentiment + breadth",
  methodology_btn: "Methodology",
  switch_to_light: "Switch to light mode",
  switch_to_dark: "Switch to dark mode",
  light: "Light",
  dark: "Dark",
  signals_sub:
    "Each signal is scored 0-100 against its own history. Click a card for the full chart, method, and limitations.",
  // IndicatorCard strings
  as_of_card: "As of",
  no_observation: "No observation",
  percentile: "Percentile",
  window: "Window",
  scored: "Scored",
  zero_weight: "Zero weight",
  supplementary: "Supplementary",
  preliminary: "Preliminary",
  feed_required: "Feed required",
  history_unavailable: "History unavailable",
  authorized_not_configured: "Authorized data not configured",
  // States
  could_not_load_market: "Could not load market data",
  try_again: "Try again",
  check_api:
    "Check that the FastAPI service is running, or that the static snapshots exist and VITE_DATA_MODE is set correctly.",
  // Investor guide
  investor_guide_btn: "Guide for new investors",
  investor_guide_title: "What your scores mean for your money",
  investor_guide_how_scores_work: "How the scores work",
  investor_guide_no_data: "Investor guide will be available once data is loaded.",
  investor_guide_intro:
    "Each indicator is scored 0-100. Higher scores (70-100) suggest the market is cheap (good time to invest). Lower scores (0-30) suggest the market is expensive (consider waiting).\n\nThe composite score combines all indicators:\n0-20 = Very Overvalued (expensive)\n20-40 = Overvalued\n40-60 = Neutral\n60-80 = Undervalued (cheap)\n80-100 = Very Undervalued",
  investor_guide_indicators: "Understanding each indicator",
  investor_guide_scoring_bands: "What each composite score means",
  investor_guide_bands_table: {
    very_overvalued: { label: "0-20 : Very Overvalued", advice: "Prices are historically expensive. Strong caution warranted. Consider reducing risk or waiting for a better entry. If investing, keep positions smaller and diversify." },
    overvalued: { label: "20-40 : Overvalued", advice: "The market is on the expensive side. Use dollar-cost averaging (investing a fixed amount regularly) rather than going all-in." },
    neutral: { label: "40-60 : Neutral", advice: "The market is priced fairly. A reasonable time to invest with a long-term horizon. Don't try to time the market -- invest consistently and hold." },
    undervalued: { label: "60-80 : Undervalued", advice: "Prices are relatively cheap. This is a favorable environment for investing. Consider increasing regular contributions." },
    very_undervalued: { label: "80-100 : Very Undervalued", advice: "Very rare. Markets are historically cheap. Historically an excellent time to invest. However, don't go all-in at once -- use dollar-cost averaging." },
  },
  investor_guide_principles: "Key principles to remember",
  investor_guide_principle_no_indicator_pure: { title: "No indicator is perfect", text: "Every metric has blind spots. CAPE is slow to change. RSI can stay extreme. The Buffett Indicator has drifted higher over time. Use the composite (all indicators combined) rather than any single measure." },
  investor_guide_principle_time_matters: { title: "Time horizon matters most", text: "If you're investing for 20+ years (retirement, college fund), today's valuation matters less -- you have time to recover. If you need the money within 3 years, today's valuation is critical." },
  investor_guide_principle_dca_beats_timing: { title: "Dollar-cost averaging beats timing", text: "Invest the same amount regularly (monthly, biweekly). This automatically buys more when prices are low and less when prices are high -- historically producing better results for most investors." },
  investor_guide_principle_diversify: { title: "Diversify to protect yourself", text: "Even during 'expensive' periods, a diversified portfolio (stocks + bonds + international) tends to survive and grow. Diversification is the only free lunch in investing." },
  investor_guide_principle_past_not_future: { title: "Past performance doesn't guarantee future results", text: "Historical percentiles describe where we've been, not where we're going. Markets can reach 'extreme' valuations that last for years." },
  investor_guide_glossary: "Glossary of terms",
  glossary: {
    cape: "Cyclically Adjusted Price-to-Earnings ratio. Uses 10 years of inflation-adjusted earnings to smooth out temporary booms and busts.",
    pe: "Price-to-Earnings ratio. A P/E of 25 means you pay $25 for $1 of annual earnings.",
    erp: "The extra return you earn for choosing stocks (risky) over bonds (safer). When ERP is negative, bonds pay more than stocks earn -- not a good trade.",
    vix: "The 'fear gauge.' Measures expected volatility. Above 30 indicates fear. Below 15 suggests complacency.",
    market_cap: "The total value of a company's shares (price x number of shares). Larger companies have more influence on the S&P 500.",
    dollar_cost_average: "Investing a fixed amount at regular intervals regardless of price. Reduces the risk of investing all at once at a bad time.",
    volatility: "How much prices fluctuate. High volatility = big swings up and down. Low volatility = stable prices.",
    mean_reversion: "The tendency for prices and metrics to return to their historical average over time.",
  },

  // ------------------------------------------------------------------
  // Shared UI vocabulary
  coverage_label: "Coverage",
  confidence_label: "Confidence",
  notes_suffix: (n: number) => `${n} note${n === 1 ? "" : "s"}`,
  max_range: "Max",
  close_aria: "Close details",
  aria_open_details: "Open details.",
  guide_open_btn: "Investor guide",
  static_snapshot: "Static snapshot",
  data_release: "Data release",
  // charts
  chart_labels: {
    composite_gauge: "Composite score",
    composite_series: "Composite",
    spx: "S&P 500",
    ma200: "200-day average",
    deviation: "Deviation",
    ma_slope: "20-day MA slope",
    rsp_norm: "RSP (normalized)",
    spy_norm: "SPY (normalized)",
    ratio: "RSP / SPY ratio",
    change_252: "252-day change",
    earnings_yield: "Earnings yield",
    treasury: "10Y Treasury",
    method: "Method",
    forward: "Forward",
    trailing: "Trailing proxy",
    preliminary: "preliminary",
    total_return_proxy: "Total-return proxy",
    coverage_word: "coverage",
    confidence_word: "confidence",
  },
  // classification vocabulary (keys from the API)
  band_labels: {
    very_overvalued: "Very Overvalued",
    overvalued: "Overvalued",
    neutral: "Neutral",
    undervalued: "Undervalued",
    very_undervalued: "Very Undervalued",
    unavailable: "Insufficient data",
    unfavorable: "Unfavorable",
    mixed: "Mixed",
    supportive: "Supportive",
  },
  classification_from_en: {
    "Very Overvalued": "very_overvalued",
    Overvalued: "overvalued",
    Neutral: "neutral",
    Undervalued: "undervalued",
    "Very Undervalued": "very_undervalued",
    "Insufficient data": "unavailable",
    Unfavorable: "unfavorable",
    Mixed: "mixed",
    Supportive: "supportive",
  } as Record<string, string>,
  trend_labels: { Bullish: "Bullish", Bearish: "Bearish", Neutral: "Neutral" } as Record<string, string>,
  mood_labels: { Fear: "Fear", Greed: "Greed", Neutral: "Neutral" } as Record<string, string>,
  source_labels: {
    "CNN Fear & Greed": "CNN Fear & Greed",
    "VIX/RSI proxy": "VIX/RSI proxy",
  } as Record<string, string>,
  sentiment_notes: {
    "CNN Fear & Greed is not configured. This labeled proxy averages the VIX percentile and the RSI percentile; it is not CNN data.":
      "CNN Fear & Greed is not configured. This labeled proxy averages the VIX percentile and the RSI percentile; it is not CNN data.",
    "CNN Fear & Greed is not configured and VIX/RSI are unavailable.":
      "CNN Fear & Greed is not configured and VIX/RSI are unavailable.",
    "Authorized CNN feed.": "Authorized CNN feed.",
  } as Record<string, string>,
  confidence_labels: { low: "low", medium: "medium", high: "high" } as Record<string, string>,
  status_labels: {
    fresh: "Fresh",
    stored: "Stored",
    degraded: "Degraded",
    stale: "Stale",
    unscored: "Unscored",
    unavailable: "Unavailable",
    unknown: "Unknown",
  } as Record<string, string>,
  quality_labels: {
    ok: "OK",
    proxy: "Trailing proxy",
    survivorship: "Survivorship bias",
    short_window: "Short window",
    supplementary: "Supplementary",
    direct_scale: "Direct scale",
  } as Record<string, string>,
  flag_titles: {} as Record<string, string>,
  data_flag_notes: {
    forward_pe_unavailable: "Forward P/E is unavailable, so the fundamental valuation category currently relies on CAPE alone. Trailing P/E was not substituted.",
    fear_greed_unavailable: "CNN Fear & Greed is unavailable because no authorized feed is configured. Sentiment uses VIX, RSI, and the 200-day trend; the summary's fear/greed label is a labeled VIX/RSI proxy.",
    erp_proxy: "The equity risk premium is a trailing earnings-yield proxy, not a full expected-return model.",
    breadth_survivorship: "Market breadth uses the current S&P 500 constituent list across history. The series is survivorship-biased and is not a fully representative point-in-time history.",
    short_percentile_window: "One or more percentiles use a shorter window than the 20-year default because the available history is shorter. The component cards disclose the window actually used.",
    buffett_supplementary: "The Buffett Indicator is displayed as supplementary evidence and carries zero weight in the composite.",
    direct_scale_component: "CNN Fear & Greed, when available, is transformed directly (100 - index) rather than percentile-ranked.",
  } as Record<string, string>,
  // categories / sections (keys from the API)
  category_labels: {
    fundamental: "Fundamental valuation",
    relative: "Relative attractiveness",
    sentiment: "Sentiment & momentum",
    breadth: "Market breadth",
  } as Record<string, string>,
  category_descriptions: {
    fundamental: "Long-term valuation relative to earnings.",
    relative: "Compensation offered by equities versus Treasuries.",
    sentiment: "Short-term fear, volatility, momentum, and trend conditions.",
    breadth: "Participation and concentration inside the index.",
  } as Record<string, string>,
  section_labels: {
    valuation: "Valuation",
    sentiment: "Sentiment & momentum",
    breadth: "Market breadth",
  } as Record<string, string>,
  frequencies: { Daily: "Daily", Weekly: "Weekly", Monthly: "Monthly", Annual: "Annual", "Vendor-defined": "Vendor-defined", Snapshot: "Snapshot" } as Record<string, string>,
  transform_labels: { inverse_percentile: "inverse percentile", percentile: "percentile", inverse_level: "inverse level" } as Record<string, string>,
  used_for_map: {} as Record<string, string>,
  source_names: {} as Record<string, string>,
  source_limitations: {} as Record<string, string>,
  percentile_th: (p: number) => `${p}th`,
  years_suffix: " years",
  years_suffix_short: "y",
  weight_of_category: (percent: number, category: string) => `${percent}% of ${category.toLowerCase()}`,
  direct_scale_word: "Direct scale",
  // indicator cards / modal
  indicator_modal: {
    pending_callout_prefix: "The newest published observation is preliminary and excluded from scores. The scored value is",
    pending_callout_suffix: "as of",
    history_from: (date: string) => `History from ${date}`,
    no_observations_range: "No observations in this range.",
    could_not_load_history: "Could not load history:",
    authorized_feed_required: "Authorized feed required",
    not_configured_default: "This indicator is not configured.",
    supplementary_note: "Supplementary evidence. This indicator carries zero weight in the composite.",
    fact_out_of_100: "out of 100",
    fact_latest_value: "Latest value",
    fact_latest_date: "Latest date",
    fact_scored_date: "Scored date",
    fact_percentile: "Percentile",
    fact_window: "Window used",
    fact_observations: "Observations",
    fact_category_weight: "Category weight",
    fact_quality: "Quality",
    what_it_measures: "What it measures",
    what_method: "Method",
    what_limitations: "Limitations",
    what_source: "Source",
  },
  // verdict panel
  verdict: {
    eyebrow: "What to do right now",
    not_forecast: "A long-horizon valuation read, not a trading signal.",
    buy: {
      label: "Good time to buy",
      detail: "The market scores historically cheap. A favorable window for steady or increased investing.",
    },
    hold: {
      label: "Hold your course",
      detail: "Prices are fairly valued. Keep regular investing on autopilot; no need to rush in or out.",
    },
    caution: {
      label: "Be cautious",
      detail: "Prices are historically expensive. Pause big lump-sum buys and stay diversified; use dollar-cost averaging.",
    },
    severe: {
      label: "Very expensive -- be patient",
      detail: "Extreme overvaluation territory. Avoid new lump-sum purchases and reduce risk if you need the money soon.",
    },
    unavailable: {
      label: "Not enough data",
      detail: "Coverage is too low for a verdict. Guidance will appear as data refreshes.",
    },
  },
  // narrative generator (replaces backend English prose)
  narrative: {
    body_lead: (score: number, band: string) =>
      `The composite score is ${score}/100, in the ${band} band.`,
    body_long_term: (score: number, label: string) => `Long-term valuation reads ${score}/100 (${label})`,
    body_long_term_none: "Long-term valuation is unavailable",
    body_conditions: (score: number, label: string) => `current market conditions read ${score}/100 (${label})`,
    body_conditions_none: "current market conditions are unavailable",
    body_tail: "The score summarizes historical relative attractiveness across four categories; it is not an objective measure of intrinsic value.",
    insufficient_headline: "Insufficient data for a composite assessment",
    insufficient_body:
      "The dashboard does not force a classification when coverage is below the configured minimum. Review the category scores and data notes below before drawing conclusions.",
    labels: {
      supports_overvalued: "Supporting the overvalued assessment",
      contradicts_overvalued: "Contradicting the overvalued assessment",
      supports_undervalued: "Supporting the undervalued assessment",
      contradicts_undervalued: "Contradicting the undervalued assessment",
      cheap_side: "Evidence on the cheaper side",
      expensive_side: "Evidence on the expensive side",
    },
    factor_percentile: (name: string, p: number, window: number | null, score: number, meaning: string) =>
      window
        ? `${name} sits in the ${p}th percentile over its ${window}-year window and scores ${score}/100, ${meaning}.`
        : `${name} sits in the ${p}th percentile and scores ${score}/100, ${meaning}.`,
    factor_plain: (name: string, score: number, meaning: string) =>
      `${name} scores ${score}/100, ${meaning}.`,
    meaning: {
      fundamental_high: "relatively cheap versus its own history",
      fundamental_low: "relatively expensive versus its own history",
      fundamental_mid: "near the middle of its historical range",
      sentiment_high: "fearful or trend-supportive conditions",
      sentiment_low: "complacent, overbought, or weak-trend conditions",
      sentiment_mid: "mixed sentiment and trend conditions",
      breadth_high: "broad participation",
      breadth_low: "narrow participation",
      breadth_mid: "mixed participation",
    },
    conflict_lt_weaker:
      "Long-term valuation is less attractive than current market conditions. The composite blends a weak valuation signal with more supportive conditions.",
    conflict_lt_stronger:
      "Long-term valuation is more attractive than current market conditions. The composite blends a stronger valuation signal with weaker conditions.",
    conflict_components: (highName: string, high: number, lowName: string, low: number) =>
      `The components disagree materially: ${highName} scores ${high}/100 while ${lowName} scores ${low}/100.`,
  },
  // methodology modal
  methodology_modal: {
    eyebrow: "Transparency",
    title: "Methodology & validation",
    weights_hash: (hash: string) => `Weights hash ${hash}`,
    updated: (date: string) => `Updated ${date}`,
    close_aria: "Close methodology",
    load_error: "Could not load methodology:",
    how_built: "How the score is built",
    score_method:
      "Each indicator is converted to a 0-100 component score. Higher scores mean more attractive or more supportive conditions. Valuation indicators use 100 - historical percentile; ERP, trend, and breadth use the historical percentile directly; Fear & Greed uses 100 - index. Percentiles are computed point-in-time over a rolling 20-year window (or the longest reliable window, disclosed on each component). Components are combined within categories, then categories are combined using the configured weights. Missing components are renormalized within their category; coverage is reported. The composite is withheld if coverage is below the configured minimum.",
    weights: "Weights",
    supplementary_word: "supplementary",
    weights_note: (coverage: string, categories: string) =>
      `Minimum coverage ${coverage} · minimum ${categories} categories. Missing components are renormalized inside their category and coverage is disclosed.`,
    data_sources: "Data sources",
    used_for: "Used for: ",
    open_source: "Open source ↗",
    validation: "Validation",
    validation_intro: (n: number, start: string, end: string) =>
      `${n} monthly scores from ${start} to ${end}. Forward returns are measured from the score date; overlapping windows mean effective sample sizes are smaller than the raw counts.`,
    h_price_return: "Composite score vs. forward price return",
    h_real_total_return: "Composite score vs. forward real total return",
    h_window_sensitivity: "Window sensitivity",
    h_out_of_sample: "Out-of-sample split",
    h_validation_limitations: "Limitations of the validation",
    open_validation_json: "Open the raw validation JSON ↗",
    no_validation_note:
      "No validation file is available yet. Run python -m app.cli refresh --validate or python -m app.cli validate to generate forward-return diagnostics.",
    table_horizon: "Horizon",
    table_n: "N",
    table_mean: "Mean",
    table_median: "Median",
    table_positive: "Positive",
    table_spearman: "Spearman",
    table_window: "Percentile window",
    table_composite: "Composite",
    table_coverage: "Coverage",
    table_classification: "Classification",
    table_period: "Period",
    table_1y_mean: "1Y mean price return",
    table_1y_positive: "1Y positive rate",
    table_1y_n: "1Y N",
    period_pre_2015: "Before 2015",
    period_2015: "2015 onward",
    quality_notes: "Data quality notes",
    disclaimer: "Disclaimer",
    limitations_map: {} as Record<string, string>,
    transform_labels_suffix: "",
  },
  // guide detail (per-indicator explainer cards)
  guide_labels: {
    eyebrow: "For new investors",
    what: "What:",
    simple: "In plain English:",
    action: "What to do:",
    analogy: "Analogy:",
  },
  guide_indicators: [
    { id: "cape", name: "Shiller CAPE Ratio", what: "The S&P 500 price divided by the average of 10 years of inflation-adjusted earnings.", simple: "If CAPE is 40, you pay $40 for every $1 of annual earnings. Historically, CAPE above 30 often means lower future returns. Below 20 often means higher future returns.", when: "High -> consider dollar-cost averaging. Low -> good time to invest.", analogy: "Like a rental house: $600,000 house with $1,200/month rent (50x) vs. $2,400/month rent (25x). The second is a better deal." },
    { id: "forward_pe", name: "Forward P/E", what: "Price divided by what analysts expect companies to earn next 12 months.", simple: "A forward P/E of 25 means for every $25 you pay, $1 of expected future earnings. Above 25 = optimistic pricing. Below 18 = potentially cheap.", when: "Rising forward P/E = prices getting expensive or earnings falling. Watch the trend.", analogy: "Guessing what a lemonade stand will earn next summer, not what it earned last summer." },
    { id: "buffett", name: "Buffett Indicator", what: "U.S. stock market value divided by U.S. GDP.", simple: "Buffett's favorite metric. Above 200% = very overvalued. Around 100-150% = moderate. Below 80% = potentially undervalued.", when: "Above 200% -> very cautious. Below 80% -> potentially good to invest.", analogy: "If the country produces $25 trillion but the stock market is worth $50 trillion -- that's the market worth more than the country." },
    { id: "erp", name: "Equity Risk Premium", what: "Extra return for buying stocks instead of safe government bonds.", simple: "If bonds pay 4% and stocks earn 3.5%, you're getting LESS for MORE risk. Positive ERP (3-4%) = stocks offer reasonable compensation.", when: "ERP above 3% -> stocks cheap vs bonds. Below 0% -> bonds pay more. Bonds may be better right now.", analogy: "$10,000 in bonds = $400/year guaranteed. Stocks = $350/year with swings. Where's the upside?" },
    { id: "fear_greed", name: "Fear & Greed", what: "Are investors scared (0-40) or greedy (60-100)?", simple: "Classic: be fearful when others are greedy, greedy when others are fearful. Below 20 = historically buying opportunity.", when: "Below 20 (Extreme Fear) -> historically a buying opportunity. Above 80 (Extreme Greed) -> very risky.", analogy: "Beach storms. Everyone runs from water during storms -- but the best swimmers know this is when to take a refreshing dip." },
    { id: "vix", name: "VIX (Volatility Index)", what: "Options traders' expectation of S&P 500 fluctuation over next 30 days.", simple: "The 'fear gauge.' Below 20 = calm. Above 30 = fear. Above 40 often coincides with market bottoms.", when: "VIX below 15 = complacency. Above 30 = fear is high. Historically buying when VIX high produces strong returns.", analogy: "VIX 10 = sunny days. VIX 40 = hurricane warning. If wrong, early buyers win big." },
    { id: "rsi", name: "RSI (14-day)", what: "14-day speedometer of how fast and hard the market has been moving.", simple: "Above 70 = overbought (might pause). Below 30 = oversold (might bounce). These are conventions, not guarantees.", when: "Below 30 = short-term oversold. Above 70 = short-term overbought. During strong trends, it can stay at extremes.", analogy: "A rubber band. The more it's stretched one way, the more likely it is to snap back." },
    { id: "ma200_deviation", name: "vs 200-day Average", what: "How far above or below the S&P 500 is from its 200-day average.", simple: "Above +20% = overextended. Below -20% = potentially undervalued. Between -10% and +10% = near fair value.", when: "Above +20% = caution. Below -20% = potential opportunity.", analogy: "If the house above the block average is $50k more, maybe the whole neighborhood got overinflated." },
    { id: "breadth_200dma", name: "Market Breadth", what: "What percentage of S&P 500 stocks are above their own 200-day average.", simple: "If only 30% of stocks are above average, the rally is narrow and fragile. If 70%+ are above, the market is broadly healthy.", when: "Below 25% = narrow. Above 75% = broad strength. Divergence warns of weakness.", analogy: "At a party, if only the DJ is having fun, the party is failing -- even if the music is loud." },
    { id: "ew_cw_relative", name: "Equal-weight vs Cap-weight", what: "How RSP (equal-weight) is doing vs SPY (cap-weight).", simple: "When RSP outperforms SPY = mid and small companies are doing well too = broad market strength. When only mega-caps = concentrate caution.", when: "RSP outperforming -> broad health. SPY significantly outpacing -> be cautious.", analogy: "In a class, if only the valedictorian is doing well but everyone else falls behind, the test might be unfair for the average student." },
  ],
  // full indicator dictionary (names, descriptions, method, limitations)
  indicatorLocales: {
    cape: {
      name: "Shiller CAPE Ratio",
      short: "CAPE",
      description: "The S&P 500 real price divided by the 10-year average of inflation-adjusted earnings.",
      methodology: "Published Shiller CAPE: the S&P 500 real price divided by the average of the preceding ten years of inflation-adjusted earnings. The published series is used without re-estimation.",
      limitations: "Monthly data. The newest month is a preliminary estimate and is excluded from scores until its publication lag has elapsed. The series uses current-vintage history, so historical revisions are not captured. CAPE is a slow-moving valuation measure and says little about near-term returns.",
      source: "Robert Shiller, Yale / shillerdata.com",
    },
    forward_pe: {
      name: "S&P 500 Forward P/E",
      short: "Forward P/E",
      description: "The S&P 500 price divided by consensus next-twelve-month earnings.",
      methodology: "S&P 500 price divided by FactSet's bottom-up consensus estimate of earnings for the next twelve months, as stated in FactSet's weekly Earnings Insight report. The value is read from the report text (one decimal place) and stored with the report date as both the observation and release date.",
      limitations: "Weekly, rounded to one decimal, and parsed from a PDF, so a change in FactSet's wording can pause updates until the parser is fixed. History starts from the first report that was fetched, so percentile scores are weak until a backfill has been run. Check FactSet's terms of use before redistributing the series. Trailing P/E is never substituted and relabeled as forward P/E.",
      source: "FactSet Earnings Insight (weekly report)",
    },
    buffett: {
      name: "Buffett Indicator",
      short: "Buffett Indicator",
      description: "U.S. listed equity market capitalization as a percentage of nominal GDP.",
      methodology: "Market capitalization of listed domestic companies as a percentage of GDP, as published by the World Bank from World Federation of Exchanges data. The series is shown as supplementary evidence and carries zero weight in the composite.",
      limitations: "Annual frequency with a substantial publication lag. Coverage is listed domestic companies, not every U.S.-listed issuer, and U.S. companies earn significant revenue abroad. It is supplementary evidence, not a timing tool or a fourth valuation vote.",
      source: "World Bank (market capitalization of listed domestic companies / GDP)",
    },
    erp: {
      name: "Equity Risk Premium (proxy)",
      short: "ERP proxy",
      description: "An earnings-yield-based proxy for the compensation offered by equities over Treasuries.",
      methodology: "Preferred method: forward earnings yield (1 / forward P/E) minus the 10-year U.S. Treasury yield. When no licensed forward P/E is available, the dashboard uses a clearly labeled trailing proxy: Shiller nominal trailing earnings divided by the S&P 500 price, minus the 10-year Treasury yield. Both legs are nominal.",
      limitations: "The fallback is an earnings-yield proxy, not a full expected-return model. It ignores growth, payout policy, buybacks, and risk premia embedded in forward estimates. The preferred forward-based version requires licensed forward earnings.",
      source: "Shiller earnings + U.S. Treasury 10-year yield",
    },
    fear_greed: {
      name: "CNN Fear & Greed Index",
      short: "Fear & Greed",
      description: "CNN Business's composite measure of market fear and greed, on a 0-100 scale.",
      methodology: "CNN Fear & Greed Index on its published 0-100 scale. The component is contrarian: score = 100 - index. Fear can create opportunity but is not proof of undervaluation.",
      limitations: "No public authorized API is bundled. The indicator stays unavailable unless an authorized feed is configured. A separate VIX/RSI sentiment proxy is displayed and explicitly labeled; it is not substituted for CNN data.",
      source: "CNN Business (authorized feed required)",
    },
    vix: {
      name: "Cboe Volatility Index (VIX)",
      short: "VIX",
      description: "The options-implied expected 30-day volatility of the S&P 500.",
      methodology: "Cboe VIX closing level. The component is contrarian: higher VIX (more fear) maps to a higher score through an inverse historical percentile.",
      limitations: "Elevated VIX is not proof that equities are cheap. VIX measures implied volatility and can remain elevated during prolonged drawdowns. It is a supplementary sentiment and risk indicator.",
      source: "Cboe Global Markets",
    },
    rsi: {
      name: "S&P 500 RSI (14-day)",
      short: "RSI (14)",
      description: "Wilder's 14-day Relative Strength Index of the S&P 500 price index.",
      methodology: "Wilder's RSI with a 14-period lookback, computed from daily S&P 500 closing prices. The component is contrarian: lower RSI maps to a higher score through an inverse historical percentile. Conventional 30/70 reference levels are displayed.",
      limitations: "RSI is a price-momentum measure, not a fundamental valuation measure. It can remain oversold or overbought for extended periods. The 30/70 levels are conventions, not statistically validated thresholds.",
      source: "S&P 500 daily closes, Wilder RSI",
    },
    ma200_deviation: {
      name: "S&P 500 vs 200-day Moving Average",
      short: "200-day trend",
      description: "The percentage distance between the S&P 500 and its 200-trading-day simple moving average.",
      methodology: "Percentage deviation of the S&P 500 close from its 200-trading-day simple moving average. The component is trend-oriented: higher deviation maps to a higher score through a historical percentile. A zero line marks the moving average.",
      limitations: "This is primarily a trend indicator, not a valuation measure. A market above its 200-day average can still be expensive, and a market below it can still be cheap.",
      source: "S&P 500 daily closes, 200-day SMA",
    },
    breadth_200dma: {
      name: "S&P 500 Constituents Above 200-day Average",
      short: "Market breadth",
      description: "The percentage of current S&P 500 constituents trading above their own 200-day averages.",
      methodology: "For each trading day, the percentage of the current S&P 500 constituent list whose adjusted close exceeds its own 200-trading-day simple moving average. The component is trend-oriented: higher breadth maps to a higher score through a historical percentile.",
      limitations: "Current constituents are used for the whole history, so the series has survivorship bias and is not a fully representative point-in-time history. History is limited to the configured lookback (six years by default). Adjusted closes are used for splits and distributions. This is a breadth condition, not a valuation measure.",
      source: "Current S&P 500 constituents + adjusted prices",
    },
    ew_cw_relative: {
      name: "Equal-weight vs Cap-weight S&P 500",
      short: "Equal-weight breadth",
      description: "Cumulative relative performance of the equal-weighted S&P 500 versus the cap-weighted index.",
      methodology: "The ratio of RSP (Invesco S&P 500 Equal Weight ETF) adjusted close to SPY (SPDR S&P 500 ETF Trust) adjusted close. Both series are normalized to 100 at their first common date for cumulative performance. The score uses the historical percentile of the 252-trading-day change in the ratio. Higher values indicate broader participation; the signal is not independently sufficient to establish overvaluation.",
      limitations: "Adjusted ETF closes approximate total return with distributions reinvested; they are not an official total-return index. RSP inception is 2003. The ratio reflects concentration in large caps but has many other drivers.",
      source: "RSP and SPY adjusted closes (total-return proxy)",
    },
  },
  thresholds_localized: ({} as Record<string, Record<string, string>>),
};

export interface IndicatorLocale {
  name: string;
  short: string;
  description: string;
  methodology: string;
  limitations: string;
  source: string;
}

export type LocaleText = Omit<typeof en, "indicatorLocales"> & {
  indicatorLocales: Record<string, IndicatorLocale>;
};

// ---------------------------------------------------------------------------

const kr: LocaleText = {
  default_label: "마켓 컴퍼스",
  tagline: "미국 주식 밸류에이션, 맥락 속에서",
  browse: "시장 살펴보기",
  as_of: "기준",
  composite_reading: "종합 읽기",
  signals: "시그널",
  valuation: "밸류에이션",
  sentiment: "감성 & 모멘텀",
  breadth: "시장 폭",
  loading: "데이터 불러오는 중...",
  error: "오류",
  no_data: "데이터 없음",
  empty_state: "표시할 데이터가 없습니다.",
  footer_meta_weights: "가중치 버전",
  footer_meta_api: "API",
  footer_meta_available: "지표 표시",
  methodology: "방법론",
  footer: "마켓 컴퍼스는 정보 제공용 리서치 도구이며, 예측이나 자동 매매 신호가 아닙니다.",
  footer_meta_point_in_time: "시점 기준(point-in-time) 방법론",
  footer_meta_research: "리서치 도구",
  header_status: "마지막 실행",
  header_status_unknown: "알 수 없음",
  header_as_of: "기준",
  footer_links_about: "소개",
  footer_links_methodology: "방법론",
  footer_links_faq: "FAQ",
  footer_links_privacy: "개인정보처리방침",
  footer_links_terms: "이용약관",
  where_market_stands: "지금 시장은 어디에 있나?",
  the_read: "핵심 리딩",
  latest_data: "최신 데이터",
  refreshed: "갱신",
  history_eyebrow: "히스토리",
  composite_score_over_time: "종합 점수 추이",
  higher_means:
    "점수가 높을수록 과거 대비 시장이 저평가됐다는 의미입니다. 선 위에 마우스를 올리면 구성 지표별 점수를 확인할 수 있습니다.",
  indicators_count: (n) => `지표 ${n}개`,
  signals_count: (n) => `시그널 ${n}개`,
  data_notes_eyebrow: "데이터 참고사항",
  what_to_keep_in_mind: "이것만은 기억하세요",
  full_methodology: "전체 방법론 보기 ↗",
  legend_rolling: "20년 롤링 백분위수 · 시점 기반",
  long_term_valuation: "장기 밸류에이션",
  current_conditions: "당면 시장 상황",
  sentiment_label: "시장 감성",
  trend_label: "추세",
  trend_unavailable: "추세 데이터 없음",
  no_history_range: "이 기간에는 채점된 히스토리가 없습니다.",
  could_not_load_composite: "종합 히스토리 로드 실패",
  fundamental_relative: "펀더멘털 + 상대 매력도",
  sentiment_breadth: "감성 + 시장 폭",
  methodology_btn: "방법론",
  switch_to_light: "라이트 모드로 전환",
  switch_to_dark: "다크 모드로 전환",
  light: "라이트",
  dark: "다크",
  signals_sub:
    "각 시그널은 자체 역사 기준 0~100점으로 환산됩니다. 카드를 클릭하면 상세 차트, 산출 방식, 한계를 볼 수 있습니다.",
  // IndicatorCard strings
  as_of_card: "기준",
  no_observation: "관측치 없음",
  percentile: "백분위",
  window: "기간",
  scored: "채점 기준",
  zero_weight: "가중치 0",
  supplementary: "보조 지표",
  preliminary: "잠정치",
  feed_required: "피드 필요",
  history_unavailable: "히스토리 없음",
  authorized_not_configured: "인증 데이터 미설정",
  // States
  could_not_load_market: "시장 데이터를 불러올 수 없습니다",
  try_again: "다시 시도",
  check_api:
    "FastAPI 서비스가 실행 중인지, 또는 정적 스냅샷이 존재하고 VITE_DATA_MODE 설정이 올바른지 확인하세요.",
  // Investor guide
  investor_guide_btn: "투자자 입문 가이드",
  investor_guide_title: "점수가 내 돈에 어떤 의미?",
  investor_guide_how_scores_work: "점수의 작동 방식",
  investor_guide_no_data: "데이터가 로드되면 가이드를 사용할 수 있습니다.",
  investor_guide_intro:
    "각 지표는 0~100점으로 환산됩니다. 높은 점수(70~100)는 시장이 저평가되어(투자에 유리) 신호를 보인다는 뜻이고, 낮은 점수(0~30)는 시장이 고평가되어(지켜보거나 기다리는 것이 유리) 신호를 보인다는 뜻입니다.\n\n종합 점수는 모든 지표를 결합합니다:\n0-20 = 매우 고평가 (비쌈)\n20-40 = 고평가\n40-60 = 중립\n60-80 = 저평가 (쌈)\n80-100 = 매우 저평가",
  investor_guide_indicators: "지표 하나씩 이해하기",
  investor_guide_scoring_bands: "종합 점수 구간의 의미",
  investor_guide_bands_table: {
    very_overvalued: { label: "0-20 : 매우 고평가", advice: "가격이 역사적 기준으로 매우 비싼 구간입니다. 신규 매수를 자제하고 리스크 축소를 검토하거나, 더 나은 진입 기회를 기다리세요. 투자한다면 규모를 줄이고 분산하세요." },
    overvalued: { label: "20-40 : 고평가", advice: "시장이 비싼 쪽입니다. 목돈을 한번에 넣기보다 적립식 투자(DCA)를 권합니다." },
    neutral: { label: "40-60 : 중립", advice: "시장이 공정하게 평가됐습니다. 장기 관점이라면 무난한 투자 구간입니다. 시장 타이밍보다 꾸준히 적립하고 HOLD하세요." },
    undervalued: { label: "60-80 : 저평가", advice: "가격이 역사적 기준으로 비교적 쌉니다. 투자에 유리한 환경이니 적립 투자 금액을 늘리는 방안을 검토해 보세요." },
    very_undervalued: { label: "80-100 : 매우 저평가", advice: "드문 기회 구간입니다. 역사적으로 좋은 매수 시기지만, 한번에 몰아 넣지 말고 적립식으로 나눠서 투자하세요." },
  },
  investor_guide_principles: "기억할 핵심 원리",
  investor_guide_principle_no_indicator_pure: { title: "어떤 지표도 완벽하지 않습니다", text: "모든 지표에는 사각지대가 있습니다. CAPE는 변화가 느리고, RSI는 극단에 오래 머물 수 있으며, 버핏 지표는 세월에 따라 수준 자체가 위로 이동했습니다. 하나가 아니라 종합 점수(전 지표 결합)를 기준으로 판단하세요." },
  investor_guide_principle_time_matters: { title: "투자 기간이 가장 중요합니다", text: "20년 이상 투자한다면(은퇴자금, 학자금) 오늘의 밸류에이션은 덜 중요합니다 — 회복할 기간이 있기 때문입니다. 반면 3년 안에 쓸 돈이라면 오늘의 밸류에이션이 결정적입니다." },
  investor_guide_principle_dca_beats_timing: { title: "적립식 투자(DCA)가 타이밍보다 낫습니다", text: "같은 금액을 정기적으로 투자하세요(매월 등). 가격이 낮을 때는 자동으로 더 많이, 높을 때는 적게 사게 되어 역사적으로 대부분의 투자자에게 더 나은 결과를 냈습니다." },
  investor_guide_principle_diversify: { title: "분산투자로 스스로를 지키세요", text: "‘고평가’ 구간에서도 분산된 포트폴리오(주식+채권+해외)는 생존하고 성장하는 경향이 있습니다. 분산은 투자에서 유일한 무료 점심입니다." },
  investor_guide_principle_past_not_future: { title: "과거 실적이 미래를 보장하지 않습니다", text: "역사적 백분위수는 ‘우리가 어디에서 건너왔는지’를 말해줄 뿐 ‘어디로 갈지’를 알려주지 않습니다. 시장은 ‘고평가’ 상태에 도달한 채 수년간 머물 수 있습니다." },
  investor_guide_glossary: "핵심 용어 사전",
  glossary: {
    cape: "경기순환 조정 주가수익비율(CAPE). 최근 10년 인플레이션 조정 이익을 분모로 써서 호황·불황을 평활화한 장기 밸류에이션 척도입니다.",
    pe: "주가수익비율(P/E). P/E 25는 연간 이익 $1당 $25를 지불한다는 뜻입니다.",
    erp: "안전한 채권 대신 위험한 주식을 선택할 때 얻는 초과 수익입니다. ERP가 음수면 채권이 주식보다 더 큰 수익을 주는 상태, 즉 나쁜 거래입니다.",
    vix: "‘공포 지수’. 시장 참여자들이 예상하는 향후 변동성입니다. 30 이상은 공포, 15 미만은 안일함을 시사합니다.",
    market_cap: "시가총액. 회사 주식 전체의 가치(주가 × 주식수)입니다. 규모가 큰 회사일수록 S&P 500에 더 큰 영향을 줍니다.",
    dollar_cost_average: "적립식 투자. 가격과 무관하게 정해진 금액을 정기적으로 사서 ‘나쁜 시점에 한번에 싹 사는’ 리스크를 줄입니다.",
    volatility: "변동성. 가격이 얼마나 크게 움직이는지를 뜻합니다. 변동성이 높으면 큰 폭 등락, 낮으면 안정된 가격을 말합니다.",
    mean_reversion: "평균 회귀. 가격과 지표가 시간이 지나면 장기 평균으로 돌아오려는 경향입니다.",
  },

  // ------------------------------------------------------------------
  // Shared UI vocabulary
  coverage_label: "커버리지",
  confidence_label: "신뢰도",
  notes_suffix: (n) => `참고 ${n}건`,
  max_range: "전체",
  close_aria: "상세 닫기",
  aria_open_details: "상세 보기.",
  guide_open_btn: "투자자 가이드",
  static_snapshot: "정적 데이터 스냅샷",
  data_release: "데이터 배포",
  // charts
  chart_labels: {
    composite_gauge: "종합 점수",
    composite_series: "종합",
    spx: "S&P 500",
    ma200: "200일 이동평균",
    deviation: "이격도",
    ma_slope: "20일 MA 기울기",
    rsp_norm: "RSP (기준화)",
    spy_norm: "SPY (기준화)",
    ratio: "RSP/SPY 비율",
    change_252: "252일 변화율",
    earnings_yield: "이익수익률",
    treasury: "10년 국채",
    method: "산출 방식",
    forward: "포워드",
    trailing: "후행 추정치",
    preliminary: "잠정치",
    total_return_proxy: "총수익(배당 재투자) 대리지표",
    coverage_word: "커버리지",
    confidence_word: "신뢰도",
  },
  // classification vocabulary (keys from the API)
  band_labels: {
    very_overvalued: "매우 고평가",
    overvalued: "고평가",
    neutral: "중립",
    undervalued: "저평가",
    very_undervalued: "매우 저평가",
    unavailable: "데이터 부족",
    unfavorable: "불리",
    mixed: "혼조",
    supportive: "유리",
  },
  classification_from_en: {},
  trend_labels: { Bullish: "상승 추세", Bearish: "하락 추세", Neutral: "중립" },
  mood_labels: { Fear: "공포", Greed: "탐욕", Neutral: "중립" },
  source_labels: {
    "CNN Fear & Greed": "CNN 공포·탐욕 지수",
    "VIX/RSI proxy": "VIX/RSI 대리지표",
  },
  sentiment_notes: {
    "CNN Fear & Greed is not configured. This labeled proxy averages the VIX percentile and the RSI percentile; it is not CNN data.":
      "CNN 공포·탐욕 지수가 설정되지 않았습니다. 이 표시된 대리지표는 VIX 백분위와 RSI 백분위의 평균이며 CNN 데이터가 아닙니다.",
    "CNN Fear & Greed is not configured and VIX/RSI are unavailable.":
      "CNN 공포·탐욕 지수가 설정되지 않았고 VIX/RSI도 사용할 수 없습니다.",
    "Authorized CNN feed.": "인증된 CNN 피드입니다.",
  },
  confidence_labels: { low: "낮음", medium: "보통", high: "높음" },
  status_labels: {
    fresh: "최신",
    stored: "저장됨",
    degraded: "저하 상태",
    stale: "기간 경과",
    unscored: "미채점",
    unavailable: "사용 불가",
    unknown: "알 수 없음",
  },
  quality_labels: {
    ok: "정상",
    proxy: "후행 추정치",
    survivorship: "생존편향",
    short_window: "짧은 기간",
    supplementary: "보조 지표",
    direct_scale: "직접 스케일",
  },
  flag_titles: {
    forward_pe_unavailable: "포워드 P/E 없음",
    fear_greed_unavailable: "공포·탐욕 지수 미설정",
    erp_proxy: "ERP 후행 추정",
    breadth_survivorship: "시장 폭 생존편향",
    short_percentile_window: "짧은 백분위 창",
    buffett_supplementary: "버핏 지표는 보조",
    direct_scale_component: "직접 스케일 변환",
  },
  data_flag_notes: {
    forward_pe_unavailable: "포워드 P/E를 사용할 수 없어 펀더멘털 밸류에이션 카테고리는 현재 CAPE만으로 채점됩니다. 후행 P/E로 대체하지 않습니다.",
    fear_greed_unavailable: "CNN 공포·탐욕 지수는 인증 피드가 설정되어 있지 않아 사용할 수 없습니다. 감성은 VIX·RSI·200일 추세로 채점되며, 요약의 공포/탐욕 레이블은 VIX/RSI 기반 대리지수입니다.",
    erp_proxy: "주식위험프리미엄(ERP)은 후행 이익수익률 기반 추정치이며, 완전한 기대수익률 모델이 아닙니다.",
    breadth_survivorship: "시장 폭은 히스토리 전 구간에서 현재 S&P 500 편입 종목 목록을 사용합니다. 생존편향이 있어 완전히 대표적인 시점별 히스토리라고 보기 어렵습니다.",
    short_percentile_window: "하나 이상의 백분위는 이력이 짧아 기본 20년 창보다 짧은 기간으로 계산됩니다. 실제 사용 기간은 각 구성 카드에 표시됩니다.",
    buffett_supplementary: "버핏 지표는 보조 자료로 표시되며 종합 점수에 가중치가 부여되지 않습니다.",
    direct_scale_component: "CNN 공포·탐욕 지수는 사용 가능할 때 백분위수 대신 100 - 지수값을 직접 사용합니다.",
  },
  // categories / sections (keys from the API)
  category_labels: {
    fundamental: "펀더멘털 밸류에이션",
    relative: "상대 매력도",
    sentiment: "감성 & 모멘텀",
    breadth: "시장 폭",
  },
  category_descriptions: {
    fundamental: "이익 대비 장기 밸류에이션 수준입니다.",
    relative: "채권 대비 주식이 주는 보상 수준입니다.",
    sentiment: "단기 공포·변동성·모멘텀·추세 상태입니다.",
    breadth: "시장 폭, 참여도와 집중도입니다.",
  },
  section_labels: {
    valuation: "밸류에이션",
    sentiment: "감성 & 모멘텀",
    breadth: "시장 폭",
  },
  frequencies: { Daily: "일간", Weekly: "주간", Monthly: "월간", Annual: "연간", "Vendor-defined": "제공처 정의" },
  transform_labels: { inverse_percentile: "역백분위수", percentile: "백분위수", inverse_level: "레벨 역변환" },
  used_for_map: {
    CAPE: "CAPE",
    "trailing earnings yield": "후행 이익수익률",
    CPI: "CPI(물가지수)",
    VIX: "VIX",
    "10-year Treasury yield": "10년 국채 금리",
    "ERP proxy": "ERP 추정치",
    "Buffett Indicator": "버핏 지수",
    "S&P 500 price": "S&P 500 지수",
    "RSP/SPY total-return proxy": "RSP/SPY 총수익 대리",
    "breadth constituent prices": "시장 폭 종목 주가",
    "Market breadth": "시장 폭",
    "Forward P/E": "포워드 P/E",
    "Forward ERP": "포워드 ERP",
    "CNN Fear & Greed Index": "CNN 공포·탐욕 지수",
  },
  source_names: {
    shiller: "로버트 실러 / shillerdata.com",
    treasury: "미국 재무부",
    worldbank: "세계은행 / 세계거래소연맹(WFE)",
    prices: "Yahoo Finance 차트 데이터셋(비공식)",
    constituents: "S&P 500 편입종목 데이터셋",
    fear_greed: "인증 CNN 공포·탐욕 피드(미설정)",
  },
  source_limitations: {
    shiller: "현재 빈티지 히스토리입니다. 이후 개정분은 반영되지 않으므로 최근 수개월은 추정치입니다.",
    cboe: "VIX는 내재변동성을 측정할 뿐 밸류에이션이 아닙니다.",
    treasury: "명목 금리이며 ERP 계산식은 이익수익률 추정치입니다.",
    worldbank: "연간 데이터로 지연이 있고 범위도 상장기업 전부가 아닙니다. 보조 자료입니다.",
    prices: "비공식 데이터셋입니다. 상업적 사용 전 공급자의 이용약관을 확인하세요. 데이터와 가중치 업데이트가 표시됩니다.",
    constituents: "현재 편입종목을 전체 구간에 사용하므로 시장 폭 히스토리에 생존편향이 있습니다.",
    forward_pe: "주간 PDF 보고서에서 파싱하며 소수 첫째 자리 반올림입니다. 히스토리는 최초 수집 보고서부터 시작하며 백필 전까지는 짧습니다.",
    fear_greed: "번들에는 공급되지 않습니다. 인증 피드가 필요하며, 어떤 대리지수도 CNN 데이터로 표시하지 않습니다.",
  },
  percentile_th: (p) => `${p}퍼센타일`,
  years_suffix: "년",
  years_suffix_short: "년",
  weight_of_category: (percent, category) => `${percent}% · ${category}`,
  direct_scale_word: "직접 스케일",
  // indicator cards / modal
  indicator_modal: {
    pending_callout_prefix: "가장 최근 발표치는 잠정치이므로 채점에서 제외됩니다. 채점에 사용된 값은",
    pending_callout_suffix: "기준",
    history_from: (date) => `히스토리 시작 ${date}`,
    no_observations_range: "이 기간에는 관측치가 없습니다.",
    could_not_load_history: "히스토리 로드 실패:",
    authorized_feed_required: "인증 데이터 피드 필요",
    not_configured_default: "이 지표는 아직 설정되지 않았습니다.",
    supplementary_note: "보조 자료입니다. 이 지표는 종합 점수에 가중치가 부여되지 않습니다.",
    fact_out_of_100: "100점 만점",
    fact_latest_value: "최신 값",
    fact_latest_date: "최신 날짜",
    fact_scored_date: "채점 기준일",
    fact_percentile: "백분위",
    fact_window: "사용 기간",
    fact_observations: "관측치 수",
    fact_category_weight: "카테고리 가중치",
    fact_quality: "품질",
    what_it_measures: "측정 내용",
    what_method: "산출 방식",
    what_limitations: "한계",
    what_source: "출처",
  },
  // verdict panel
  verdict: {
    eyebrow: "지금 무엇을 해야 하나?",
    not_forecast: "장기 밸류에이션 판단이며 단기 매매 신호가 아닙니다.",
    buy: {
      label: "매수 적기",
      detail: "역사적 기준으로 시장이 저평가된 구간입니다. 꾸준한 투자나 적립 규모를 늘리기 좋은 시기입니다.",
    },
    hold: {
      label: "현재 방향 유지",
      detail: "가격이 공정하게 평가됐습니다. 정기 투자는 그대로 유지하고, 서둘러 들어가거나 빠져나올 필요가 없습니다.",
    },
    caution: {
      label: "매수 경계",
      detail: "가격이 역사적으로 비싼 구간입니다. 목돈 일괄 매수를 보류하고 분산을 유지하며, 적립식으로만 투자하세요.",
    },
    severe: {
      label: "매우 비쌈 — 기다리자",
      detail: "극단적인 고평가 구간입니다. 신규 목돈 매수는 피하고, 곧 필요한 자금이라면 비중 축소를 검토하세요.",
    },
    unavailable: {
      label: "데이터 부족",
      detail: "커버리지가 부족해 판단을 제시할 수 없습니다. 데이터가 갱신되면 안내가 표시됩니다.",
    },
  },
  // narrative generator (replaces backend English prose)
  narrative: {
    body_lead: (score, band) => `종합 점수는 ${score}/100이며 ‘${band}’ 구간입니다.`,
    body_long_term: (score, label) => `장기 밸류에이션 점수는 ${score}/100 (${label})`,
    body_long_term_none: "장기 밸류에이션 데이터 없음",
    body_conditions: (score, label) => `당면 시장 상황 점수는 ${score}/100 (${label})`,
    body_conditions_none: "당면 시장 상황 데이터 없음",
    body_tail: "이 점수는 네 카테고리 전반의 역사적 상대 매력도를 요약한 것으로, 내재가치의 객관적 추정치가 아닙니다.",
    insufficient_headline: "종합 판단에 데이터가 부족합니다",
    insufficient_body:
      "커버리지가 최소 한계에 못 미치면 대시보드는 등급을 부여하지 않습니다. 아래 카테고리 점수와 데이터 참고사항을 먼저 확인하세요.",
    labels: {
      supports_overvalued: "고평가 판단을 뒷받침하는 근거",
      contradicts_overvalued: "고평가 판단에 반대하는 근거",
      supports_undervalued: "저평가 판단을 뒷받침하는 근거",
      contradicts_undervalued: "저평가 판단에 반대하는 근거",
      cheap_side: "저평가 쪽 근거",
      expensive_side: "고평가 쪽 근거",
    },
    factor_percentile: (name, p, window, score, meaning) =>
      window
        ? `${name}는 최근 ${window}년 창 기준 ${p}퍼센타일이며, ${score}/100으로 ${meaning}.`
        : `${name}는 ${p}퍼센타일이며, ${score}/100으로 ${meaning}.`,
    factor_plain: (name, score, meaning) =>
      `${name}는 ${score}/100이며, ${meaning}.`,
    meaning: {
      fundamental_high: "전체 히스토리 대비 비교적 쌉니다",
      fundamental_low: "전체 히스토리 대비 비쌉니다",
      fundamental_mid: "히스토리상 중간 가격대입니다",
      sentiment_high: "공포 또는 추세 개선 조건입니다",
      sentiment_low: "안일·과열 또는 약한 추세 조건입니다",
      sentiment_mid: "감성과 추세가 혼재되어 있습니다",
      breadth_high: "참여가 넓어졌습니다",
      breadth_low: "참여가 좁습니다",
      breadth_mid: "참여가 혼재되어 있습니다",
    },
    conflict_lt_weaker:
      "장기 밸류에이션이 당면 시장 상황보다 덜 매력적입니다. 종합 점수는 약한 밸류에이션 신호와 나은 당면 상황을 절충한 값입니다.",
    conflict_lt_stronger:
      "장기 밸류에이션이 당면 시장 상황보다 더 매력적입니다. 종합 점수는 강한 밸류에이션 신호와 약한 당면 상황을 절충한 값입니다.",
    conflict_components: (highName, high, lowName, low) =>
      `구성 지표 간 의견 차이가 큽니다: ${highName}는 ${high}/100인 반면 ${lowName}는 ${low}/100입니다.`,
  },
  // methodology modal
  methodology_modal: {
    eyebrow: "투명성",
    title: "방법론 및 검증",
    weights_hash: (hash) => `가중치 해시 ${hash}`,
    updated: (date) => `업데이트 ${date}`,
    close_aria: "방법론 닫기",
    load_error: "방법론 로드 실패:",
    how_built: "점수의 산출 방식",
    score_method:
      "각 지표는 0~100점의 구성 점수로 변환됩니다. 점수가 높으면 더 매력적이거나 유리한 조건입니다. 밸류에이션 지표는 100 - 역사적 백분위수, ERP·추세·시장 폭은 역사적 백분위수, 공포·탐욕은 100 - 지수를 사용합니다. 백분위수는 20년 롤링 창(또는 신뢰 가능한 최대 기간)의 시점 기준으로 계산됩니다. 구성 점수는 카테고리 단위로 결합되고, 카테고리는 사전 정의된 가중치로 결합됩니다. 누락된 구성 요소는 카테고리 내에서 재정규화되며 커버리지가 공개됩니다. 커버리지가 최소 한계 이하이면 종합 점수를 발행하지 않습니다.",
    weights: "가중치",
    supplementary_word: "보조 지표",
    weights_note: (coverage, categories) =>
      `최소 커버리지 ${coverage} · 최소 ${categories}개 카테고리. 누락된 구성 요소는 카테고리 내에서 재정규화되며, 커버리지는 공개됩니다.`,
    data_sources: "데이터 출처",
    used_for: "사용처: ",
    open_source: "원본 보기 ↗",
    validation: "검증",
    validation_intro: (n, start, end) =>
      `${start}부터 ${end}까지 샘플 점수 ${n}건을 검증했습니다. 포워드 수익률은 점수 날짜부터 측정되며, 기간이 겹치므로 유효 표본 수는 원본 건수보다 작습니다.`,
    h_price_return: "종합 점수 vs. 포워드 가격 수익률",
    h_real_total_return: "종합 점수 vs. 포워드 실질 총수익률",
    h_window_sensitivity: "기간별 민감도",
    h_out_of_sample: "샘플 분할 검증",
    h_validation_limitations: "검증의 한계",
    open_validation_json: "원본 검증 JSON 보기 ↗",
    no_validation_note:
      "검증 파일이 아직 없습니다. python -m app.cli refresh --validate 또는 python -m app.cli validate를 실행하면 포워드 수익 진단이 생성됩니다.",
    table_horizon: "기간",
    table_n: "N(표본)",
    table_mean: "평균",
    table_median: "중앙값",
    table_positive: "상승 빈도",
    table_spearman: "스피어만",
    table_window: "백분위 창",
    table_composite: "종합 점수",
    table_coverage: "커버리지",
    table_classification: "분류",
    table_period: "기간",
    table_1y_mean: "1년 평균 가격 수익률",
    table_1y_positive: "1년 상승 빈도",
    table_1y_n: "1년 표본 N",
    period_pre_2015: "2015년 이전",
    period_2015: "2015년 이후",
    quality_notes: "데이터 품질 참고",
    disclaimer: "면책",
    limitations_map: {
      "Historical data are current-vintage; revisions and vintage effects are not captured.":
        "과거 데이터는 현재 빈티지이며, 이후 개정분이나 빈티지 효과는 반영되지 않았습니다.",
      "Forward returns overlap heavily, so effective sample sizes are much smaller than the raw counts.":
        "포워드 수익은 구간이 크게 겹치므로 실제 유효 표본 수는 원본 건수보다 적습니다.",
      "The 5-year horizon has no observations for the most recent five years.":
        "5년 기간은 최근 5년분 관측치가 아직 없습니다.",
      "Total-return results rely on SPY adjusted closes and begin in 2003; earlier results are price-only.":
        "총수익 결과는 SPY 조정 종가에 의존하며 2003년부터 시작됩니다. 그 이전 결과는 가격 수익률만 반영합니다.",
      "Market breadth uses current constituents and is survivorship-biased.":
        "시장 폭은 현재 편입 종목 목록을 사용하므로 생존편향이 있습니다.",
      "Forward P/E is absent unless a licensed feed is configured, so the fundamental category and its baseline may be unavailable.":
        "라이선스 피드가 설정되지 않으면 포워드 P/E가 없어 펀더멘털 카테고리와 그 기준선을 사용할 수 없습니다.",
      "Weights are explicit assumptions, not statistically optimized parameters. No out-of-sample weight fitting was performed.":
        "가중치는 명시적 가정이지 통계적으로 최적화된 값이 아니며, 샘플 밖 가중치 피팅은 수행되지 않았습니다.",
      "Returns exclude taxes, transaction costs, and implementation shortfall. The composite is not a trading strategy.":
        "수익률에는 세금·거래비용·실행 미스가 반영되지 않았습니다. 종합 점수는 매매 전략이 아닙니다.",
    },
    transform_labels_suffix: "",
  },
  // guide detail (per-indicator explainer cards)
  guide_labels: {
    eyebrow: "처음 투자하는 분들을 위해",
    what: "무엇인지:",
    simple: "쉽게 말하면:",
    action: "그래서 어떻게:",
    analogy: "비유:",
  },
  guide_indicators: [
    { id: "cape", name: "실러 CAPE 비율", what: "S&P 500 지수를 최근 10년 인플레이션 조정 평균 이익으로 나눈 값.", simple: "CAPE가 40이면 연간 이익 $1당 $40을 지불한다는 뜻 입니다. 역사적으로 CAPE 30 초과는 미래 수익률이 낮았고 20 미만은 높았습니다.", when: "높으면 적립식 투자를 고려하고, 낮으면 투자하기 좋은 시기입니다.", analogy: "집으로 비유하면: 6억원짜리 집의 월세가 100만원(50배)인 경우와 200만원(25배)인 경우, 후자가 훨씬 좋은 거래입니다." },
    { id: "forward_pe", name: "포워드 P/E", what: "지수를 분석가들이 예상하는 다음 12개월 이익으로 나눈 값.", simple: "포워드 P/E 25는 $25를 지불해 기대 이익 $1을 얻는 것, 25 초과는 기대감이 반영된 가격, 18 미만은 저평가된 가격입니다.", when: "포워드 P/E 상승 = 가격이 비싸지거나 이익이 줄어드는 중. 추세를 주시하세요.", analogy: "레모네이드 가게가 지난여름에 번 돈이 아니라 다음 여름에 벌 돈을 예상해 값을 매기는 것과 같습니다." },
    { id: "buffett", name: "버핏 지수", what: "미국 주식시장 총가치를 미국 GDP로 나눈 비율.", simple: "버핏이 가장 좋아하는 지수. 200% 초과 = 매우 고평가, 100~150% = 중간 수준, 80% 미만 = 저평가 가능성입니다.", when: "200% 이상이면 매우 신중하게, 80% 미만이면 투자하기 좋을 수 있습니다.", analogy: "한 나라가 연 25조 달러를 생산하는데 주식시장 가치가 50조 달러라면, 시장이 나라 경제보다 더 비싸게 평가받는 셈입니다." },
    { id: "erp", name: "주식위험프리미엄(ERP)", what: "채권대비 주식을 고려할 때 얻는 초과 수익.", simple: "채권이 4%를 주는데 주식 기대 이익이 3.5%면, 더 큰 위험을 위해 적은 보상을 받는 것입니다. ERP가 양수(3~4%)이면 주식이 합리적인 보상을 제공합니다.", when: "ERP 3% 이상은 채권 대비 주식이 싸다. 0% 미만은 채권이 더 유리한 상황.", analogy: "채권 1만원 = 연 400원 확정, 주식 1만원 = 등락을 겪으며 연 350원. 더 큰 위험에 보상은 더 적습니다." },
    { id: "fear_greed", name: "공포·탐욕 지수", what: "투자자들이 공포(0-40) 중인지 탐욕(60-100) 중인지 보여주는 지표.", simple: "남들이 탐욕스러울 때 두려워하고, 남들이 두려워할 때 탐욕스러워지라는 격언이 있습니다. 20 미만은 역사적으로 매수 기회였습니다.", when: "20 미만(극단적 공포)은 역사적 매수 기회. 80 초과(극단적 탐욕)는 매우 위험.", analogy: "폭풍우 치는 해변. 모두가 물에서 나올 때, 노련한 수영꾼은 그때가 기회일 수 있음을 압니다." },
    { id: "vix", name: "VIX(변동성 지수)", what: "옵션 시장이 보는 향후 30일 S&P 500 등락 예상치.", simple: "‘공포 게이지’. 20 미만 = 평온, 30 초과 = 공포, 40 초과는 종종 시장 바닥과 겹칩니다.", when: "VIX 15 미만 = 안일함. 30 초과 = 공포가 큼. 역사적으로 VIX가 높을 때 매수하면 강한 수익이 뒤따릅니다.", analogy: "VIX 10 = 맑은 날씨. VIX 40 = 태풍 경보. 경보가 과장이었다면, 일찍 매수한 사람이 크게 이깁니다." },
    { id: "rsi", name: "RSI(14일)", what: "시장이 얼마나 빠르고 세게 움직였는지를 측정하는 14일 속도계.", simple: "70 초과는 과열(잠시 쉬어갈 수 있음), 30 미만은 과매도(반등 가능). 보장이 아니라 관례입니다.", when: "30 미만 = 단기 과매도. 70 초과 = 단기 과열. 강한 추세에서는 극단에 오래 머뭅니다.", analogy: "고무줄. 한쪽으로 더 늘어날수록 반대로 튕겨 돌아올 가능성도 커집니다." },
    { id: "ma200_deviation", name: "200일 이동평균 대비", what: "S&P 500이 200일 평균보다 몇 % 높거나 낮은가.", simple: "+20% 초과 = 과열, -20% 미만 = 매우 저평가, 그 사이는 공정한 가격대 근처.", when: "+20% 초과 = 주의. -20% 미만 = 기회 가능성.", analogy: "같은 동네 평균보다 5천만원 비싼 집이 있다면, 그 집이나 동네 전체가 과열됐을 수 있습니다." },
    { id: "breadth_200dma", name: "시장 폭", what: "S&P 500 종목 중 자체 200일선 위에 있는 비율.", simple: "30%만 평균 위에 있으면 랠리가 좁고 취약합니다. 70% 이상이면 시장이 전반적으로 건강합니다.", when: "25% 미만 = 좁은 시장, 75% 이상 = 넓은 강세. 지수는 오르는데 참여 종목이 줄면 약세 경고입니다.", analogy: "파티에서 DJ만 신나고 나머지는 모두 지루해한다면, 음악이 아무리 커도 파티는 실패입니다." },
    { id: "ew_cw_relative", name: "동일가중 vs 시가총액가중", what: "RSP(동일가중)가 SPY(시가총액가중) 대비 얼마나 움직이는가.", simple: "RSP가 SPY보다 강하면 중소형 기업도 함께 오른다는 뜻이라 시장 전반이 건강합니다. 초대형주만 오르면 쏠림에 주의하세요.", when: "RSP가 강세면 시장 전반이 건강합니다. SPY가 크게 앞서면 주의하세요.", analogy: "반에서 1등만 잘하고 나머지는 뒤처진다면, 평범한 학생에게는 시험이 불공정할 수 있습니다." },
  ],
  // full indicator dictionary (names, descriptions, method, limitations)
  indicatorLocales: {
    cape: {
      name: "실러 CAPE 비율",
      short: "CAPE",
      description: "S&P 500 실질 지수를 최근 10년 인플레이션 조정 평균 이익으로 나눈 값.",
      methodology: "실러가 발표한 CAPE 시계열을 그대로 사용합니다: S&P 500 실질 지수를 직전 10년 인플레이션 조정 평균 이익으로 나눕니다. 발표된 시계열을 재추정 없이 사용합니다.",
      limitations: "월간 데이터이며 가장 최근 달은 추정치라 발표 지연이 지나기 전까지 채점에서 제외됩니다. 현재 빈티지 히스토리를 사용하므로 과거 개정분이 반영되지 않습니다. CAPE는 변화가 느린 밸류에이션 척도로 단기 수익률에 대해서는 거의 말해주지 않습니다.",
      source: "로버트 실러, Yale / shillerdata.com",
    },
    forward_pe: {
      name: "S&P 500 포워드 P/E",
      short: "포워드 P/E",
      description: "S&P 500 지수를 컨센서스 향후 12개월 예상 이익으로 나눈 값.",
      methodology: "FactSet의 주간 Earnings Insight 보고서에 명시된 바텀업 컨센서스 향후 12개월 이익 추정치로 S&P 500 지수를 나눕니다. 값은 보고서 본문에서 소수 첫째 자리로 읽어, 보고서 날짜를 관측일·발표일로 함께 저장합니다.",
      limitations: "주간 데이터이며 소수 첫째 자리 반올림이고 PDF에서 파싱됩니다. FactSet 문구가 바뀌면 파서가 수정될 때까지 갱신이 중단될 수 있습니다. 히스토리는 최초 수집 시점부터 시작되어 백필 전에는 백분위 점수의 신뢰도가 낮습니다. 재배포 전에 FactSet 이용약관을 확인하세요. 후행 P/E를 포워드 P/E로 대체하거나 레이블을 바꾸지 않습니다.",
      source: "FactSet Earnings Insight (주간 보고서)",
    },
    buffett: {
      name: "버핏 지수",
      short: "버핏 지수",
      description: "미국 상장 주식 시가총액을 명목 GDP로 나눈 비율.",
      methodology: "세계은행이 세계거래소연맹(WFE) 자료에서 집계하는 ‘국내 상장기업 시가총액 / GDP’ 비율입니다. 보조 자료로 표시되며 종합 점수에 가중치가 부여되지 않습니다.",
      limitations: "연간 데이터이며 발표 지연이 큽니다. 범위는 국내 상장기업 시가총액일 뿐 미국 발행 종목 전체가 아니며, 미국 기업의 해외 매출 비중도 큽니다. 타이밍 도구가 아니라 보조 자료입니다.",
      source: "세계은행 (국내 상장기업 시가총액 / GDP)",
    },
    erp: {
      name: "주식위험프리미엄 (추정치)",
      short: "ERP (추정)",
      description: "채권 대신 주식이 주는 보상을 이익수익률 기반으로 추정한 값.",
      methodology: "선호 방식은 포워드 이익수익률(1 ÷ 포워드 P/E)에서 10년 국채 금리를 뺀 값입니다. 라이선스 포워드 P/E가 없으면 명확히 표기된 후행 추정치를 사용합니다: 실러 명목 후행 이익 ÷ S&P 500 지수 - 10년 국채 금리. 두 레그 모두 명목치입니다.",
      limitations: "후행식은 이익수익률 추정치이지 완전한 기대수익률 모델이 아닙니다. 성장·배당 정책·자사주 매입·포워드 추정에 내재된 위험 프리미엄이 반영되지 않습니다. 포워드 기반 선호 버전은 라이선스 포워드 이익이 필요합니다.",
      source: "실러 이익 + 미국 재무부 10년 국채 금리",
    },
    fear_greed: {
      name: "CNN 공포·탐욕 지수",
      short: "공포·탐욕",
      description: "CNN이 발표하는 시장 공포와 탐욕의 종합 지수(0~100).",
      methodology: "CNN 공포·탐욕 지수를 발표 스케일(0~100) 그대로 사용합니다. 구성 요소는 역추세 방식입니다: 점수 = 100 - 지수. 공포는 기회를 만들 수 있지만 저평가의 증거는 아닙니다.",
      limitations: "공개 인증 API가 번들에 제공되지 않습니다. 인증 피드가 설정되지 않으면 계속 ‘사용 불가’ 상태로 유지됩니다. 별도의 VIX/RSI 감성 대리지수가 레이블과 함께 표시되며 CNN 데이터로 대체되지 않습니다.",
      source: "CNN Business (인증 피드 필요)",
    },
    vix: {
      name: "Cboe 변동성 지수(VIX)",
      short: "VIX",
      description: "옵션 시장이 반영한 향후 30일 S&P 500 변동성 예상치.",
      methodology: "Cboe VIX 종가를 사용합니다. 역추세 구성: VIX가 높을수록(공포 커질수록) 역사적 백분위의 역변환을 통해 높은 점수가 됩니다.",
      limitations: "VIX 상승은 주식이 저렴하다는 증거가 아닙니다. VIX는 내재변동성을 측정하며 장기 하락 중 오래 높게 유지될 수 있습니다. 보조적인 감성·리스크 지표입니다.",
      source: "Cboe Global Markets",
    },
    rsi: {
      name: "S&P 500 RSI (14일)",
      short: "RSI (14)",
      description: "S&P 500 지수의 와일더 14일 상대강도지수(RSI).",
      methodology: "S&P 500 일별 종가로 와일더 RSI(14기간)를 계산합니다. 역추세 구성: RSI가 낮을수록 역사적 백분위의 역변환을 통해 높은 점수가 됩니다. 관례적인 30/70 기준선을 함께 표시합니다.",
      limitations: "RSI는 가격 모멘텀 척도이지 펀더멘털 밸류에이션 척도가 아닙니다. 과매도·과열 상태에 오래 머물 수 있습니다. 30/70은 관례일 뿐 통계적으로 검증된 임계값이 아닙니다.",
      source: "S&P 500 일별 종가, 와일더 RSI",
    },
    ma200_deviation: {
      name: "S&P 500 200일 이동평균 대비",
      short: "200일 추세",
      description: "S&P 500 종가와 200거래일 단순 이동평균 사이의 백분율 거리.",
      methodology: "S&P 500 종가와 200거래일 단순 이동평균의 백분율 이격도를 사용합니다. 추세 방향 구성: 이격도가 높을수록 역사적 백분위를 통해 높은 점수가 됩니다. 0선이 이동평균 위치입니다.",
      limitations: "주로 추세 지표이지 밸류에이션 척도가 아닙니다. 200일선 위 시장도 여전히 비쌀 수 있고, 아래 시장도 여전히 쌀 수 있습니다.",
      source: "S&P 500 일별 종가, 200일 SMA",
    },
    breadth_200dma: {
      name: "S&P 500 200일선 위 종목수",
      short: "시장 폭",
      description: "현재 S&P 500 편입종목 중 자체 200일 평균 위에서 거래되는 종목의 비율.",
      methodology: "매 거래일, 현재 S&P 500 편입종목 목록 중 조정 종가가 자체 200거래일 단순 이동평균을 넘어서는 종목의 비율을 계산합니다. 추세 방향 구성: 시장 폭이 넓을수록 역사적 백분위를 통해 높은 점수가 됩니다.",
      limitations: "현재 편입종목을 전체 구간에 사용하므로 시계열에 생존편향이 있고, 완전히 대표적인 시점별 히스토리가 아닙니다. 설정된 조회 기간(기본 6년)으로 히스토리가 제한됩니다. 분할·분배에는 조정 종가가 사용됩니다. 시장 폭 상태이지 밸류에이션 척도가 아닙니다.",
      source: "현재 S&P 500 편입종목 + 조정 종가",
    },
    ew_cw_relative: {
      name: "동일가중 vs 시가총액가중 S&P 500",
      short: "동일가중 폭",
      description: "동일가중 S&P 500 대비 시가총액가중 지수의 누적 상대 퍼포먼스.",
      methodology: "RSP(인베스코 S&P 500 동일가중 ETF) 조정 종가를 SPY(SPDR S&P 500 ETF) 조정 종가로 나눈 비율을 사용합니다. 두 시계열은 첫 공통 날짜에서 100으로 기준화해 누적 퍼포먼스를 비교합니다. 점수는 이 비율의 252거래일 변화율에 대한 역사적 백분위를 사용합니다. 값이 높으면 참여가 넓다는 뜻이지만, 이 신호만으로 고평가를 입증할 수는 없습니다.",
      limitations: "조정 ETF 종가는 배당 재투자된 총수익에 근접하지만 공식 지수가 아닙니다. RSP는 2003년 출시입니다. 이 비율은 대형주 집중을 반영하지만 다른 변인들도 있습니다.",
      source: "RSP·SPY 조정 종가 (총수익 대리지표)",
    },
  },
  thresholds_localized: {
    rsi: { "30": "과매도 (관례)", "70": "과열 (관례)" },
    ma200_deviation: { "0": "200일 이동평균 위치" },
  },

};

export const LOCALE_TEXT: Record<LocaleKey, LocaleText> = { kr, en };

export type LocaleTextType = typeof LOCALE_TEXT["kr"];

// ---------------------------------------------------------------------------
// Helper API used across components

export type VerdictKey = "buy" | "hold" | "caution" | "severe" | "unavailable";

export function verdictForScore(score: number | null): VerdictKey {
  if (score === null || !Number.isFinite(score)) return "unavailable";
  if (score >= 60) return "buy";
  if (score >= 40) return "hold";
  return score >= 20 ? "caution" : "severe";
}

export const VERDICT_COLORS: Record<VerdictKey, string> = {
  buy: "#4fb98a",
  hold: "#d8c07a",
  caution: "#e06c75",
  severe: "#e06c75",
  unavailable: "#8b9aa8",
};

export const VERDICT_ICONS: Record<VerdictKey, string> = {
  buy: "◆",
  hold: "◇",
  caution: "△",
  severe: "▼",
  unavailable: "○",
};

/** Band key from a 0-100 composite score, mirroring the server-side bands. */
export function bandKeyForScore(score: number | null): string {
  if (score === null || !Number.isFinite(score)) return "unavailable";
  if (score < 20) return "very_overvalued";
  if (score < 40) return "overvalued";
  if (score < 60) return "neutral";
  if (score < 80) return "undervalued";
  return "very_undervalued";
}

export interface NarrativeComponent {
  id: string;
  category: ComponentCategory;
  score: number;
  percentile: number | null;
  windowYears: number | null;
}

export interface NarrativeInput {
  score: number | null;
  longTermScore: number | null;
  conditionsScore: number | null;
  components: NarrativeComponent[];
}

export interface NarrativeFactor {
  id: string;
  label: string;
  score: number;
  text: string;
}

export interface Narrative {
  headline: string;
  body: string;
  supportingLabel: string;
  contradictingLabel: string;
  supporting: NarrativeFactor[];
  contradicting: NarrativeFactor[];
  conflicts: string[];
}

function meaningFor(
  text: LocaleTextType,
  category: ComponentCategory,
  score: number,
): string {
  const key =
    category === "breadth"
      ? score >= 60
        ? "breadth_high"
        : score <= 40
          ? "breadth_low"
          : "breadth_mid"
      : category === "sentiment"
        ? score >= 60
          ? "sentiment_high"
          : score <= 40
            ? "sentiment_low"
            : "sentiment_mid"
        : score >= 60
          ? "fundamental_high"
          : score <= 40
            ? "fundamental_low"
            : "fundamental_mid";
  return (text.narrative.meaning as Record<string, string>)[key];
}

function bandLabel(text: LocaleTextType, score: number | null): string {
  const key = bandKeyForScore(score);
  return text.band_labels[key as keyof typeof text.band_labels] ?? String(key);
}

/**
 * Rebuilds the composite narrative in the UI language. Mirrors the backend's
 * `build_explanation` logic (sorting, roles, conflict thresholds) so the EN
 * output stays equivalent, while KR output is a native translation.
 */
export function buildNarrative(
  locale: LocaleKey,
  input: NarrativeInput,
): Narrative {
  const text = LOCALE_TEXT[locale];
  const { score, longTermScore, conditionsScore, components } = input;

  const sorted = [...components].sort((a, b) => b.score - a.score);

  const makeFactor = (component: NarrativeComponent): NarrativeFactor => ({
    id: component.id,
    label: shortLabelFor(text, component.id),
    score: component.score,
    text:
      component.percentile !== null && component.percentile !== undefined
        ? text.narrative.factor_percentile(
            shortLabelFor(text, component.id),
            Math.round(component.percentile),
            component.windowYears !== null ? Number(component.windowYears.toFixed(1)) : null,
            Math.round(component.score),
            meaningFor(text, component.category, component.score),
          )
        : text.narrative.factor_plain(
            shortLabelFor(text, component.id),
            Math.round(component.score),
            meaningFor(text, component.category, component.score),
          ),
  });

  if (score === null) {
    return {
      headline: text.narrative.insufficient_headline,
      body: text.narrative.insufficient_body,
      supportingLabel: "",
      contradictingLabel: "",
      supporting: [],
      contradicting: [],
      conflicts: [],
    };
  }

  let supporting: NarrativeFactor[];
  let contradicting: NarrativeFactor[];
  let supportingLabel: string;
  let contradictingLabel: string;
  if (score < 40) {
    supporting = sorted.slice(-2).map(makeFactor).reverse();
    contradicting = sorted.slice(0, 2).map(makeFactor);
    supportingLabel = text.narrative.labels.supports_overvalued;
    contradictingLabel = text.narrative.labels.contradicts_overvalued;
  } else if (score > 60) {
    supporting = sorted.slice(0, 2).map(makeFactor);
    contradicting = sorted.slice(-2).map(makeFactor).reverse();
    supportingLabel = text.narrative.labels.supports_undervalued;
    contradictingLabel = text.narrative.labels.contradicts_undervalued;
  } else {
    supporting = sorted.slice(0, 2).map(makeFactor);
    contradicting = sorted.slice(-2).map(makeFactor).reverse();
    supportingLabel = text.narrative.labels.cheap_side;
    contradictingLabel = text.narrative.labels.expensive_side;
  }

  const conflicts: string[] = [];
  const hasBoth =
    longTermScore !== null &&
    conditionsScore !== null &&
    Number.isFinite(longTermScore) &&
    Number.isFinite(conditionsScore);
  if (hasBoth && Math.abs(longTermScore - conditionsScore) >= 25) {
    conflicts.push(
      longTermScore < conditionsScore
        ? text.narrative.conflict_lt_weaker
        : text.narrative.conflict_lt_stronger,
    );
  }
  if (sorted.length >= 2 && sorted[0].score - sorted[sorted.length - 1].score >= 30) {
    conflicts.push(
      text.narrative.conflict_components(
        shortLabelFor(text, sorted[0].id),
        Math.round(sorted[0].score),
        shortLabelFor(text, sorted[sorted.length - 1].id),
        Math.round(sorted[sorted.length - 1].score),
      ),
    );
  }

  const headline = `${bandLabel(text, score)} · ${Math.round(score)}/100`;
  const ltText =
    longTermScore !== null && Number.isFinite(longTermScore)
      ? text.narrative.body_long_term(Math.round(longTermScore), bandLabel(text, longTermScore))
      : text.narrative.body_long_term_none;
  const condText =
    conditionsScore !== null && Number.isFinite(conditionsScore)
      ? text.narrative.body_conditions(Math.round(conditionsScore), bandLabel(text, conditionsScore))
      : text.narrative.body_conditions_none;
  const body = `${text.narrative.body_lead(Math.round(score), bandLabel(text, score))} ${ltText}, ${condText}. ${text.narrative.body_tail}`;

  return { headline, body, supportingLabel, contradictingLabel, supporting, contradicting, conflicts };
}

export function shortLabelFor(text: LocaleTextType, indicatorId: string): string {
  const entry = text.indicatorLocales[indicatorId];
  return entry ? entry.short : indicatorId;
}
