from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

Transform = Literal["inverse_percentile", "percentile", "inverse_level"]


@dataclass(frozen=True)
class IndicatorDef:
    id: str
    name: str
    short_name: str
    description: str
    section: Literal["valuation", "sentiment", "breadth"]
    category: Literal["fundamental", "relative", "sentiment", "breadth"]
    unit: str
    value_kind: Literal["multiple", "percent", "percentage_points", "index", "score", "ratio"]
    frequency: str
    source_name: str
    source_url: str
    methodology: str
    limitations: str
    order: int
    transform: Transform
    supplementary: bool = False
    chart_kind: Literal["line", "ma200", "relative"] = "line"
    thresholds: list[dict] = field(default_factory=list)
    optional: bool = False
    unavailable_reason: str | None = None


INDICATORS: dict[str, IndicatorDef] = {
    "cape": IndicatorDef(
        id="cape",
        name="Shiller CAPE Ratio",
        short_name="CAPE",
        description="The S&P 500 real price divided by the 10-year average of inflation-adjusted earnings.",
        section="valuation",
        category="fundamental",
        unit="x",
        value_kind="multiple",
        frequency="Monthly",
        source_name="Robert Shiller, Yale / shillerdata.com",
        source_url="https://shillerdata.com/",
        methodology=(
            "Published Shiller CAPE: the S&P 500 real price divided by the average of the "
            "preceding ten years of inflation-adjusted earnings. The published series is used "
            "without re-estimation."
        ),
        limitations=(
            "Monthly data. The newest month is a preliminary estimate and is excluded from "
            "scores until its publication lag has elapsed. The series uses current-vintage "
            "history, so historical revisions are not captured. CAPE is a slow-moving "
            "valuation measure and says little about near-term returns."
        ),
        order=1,
        transform="inverse_percentile",
    ),
    "forward_pe": IndicatorDef(
        id="forward_pe",
        name="S&P 500 Forward P/E",
        short_name="Forward P/E",
        description="The S&P 500 price divided by consensus next-twelve-month earnings.",
        section="valuation",
        category="fundamental",
        unit="x",
        value_kind="multiple",
        frequency="Monthly",
        source_name="Licensed feed (not bundled)",
        source_url="",
        methodology=(
            "S&P 500 index level divided by consensus expected earnings for the next twelve "
            "months. The earnings basis (operating or reported) is supplied with the imported "
            "series and shown in the source metadata."
        ),
        limitations=(
            "No free, authorized historical forward-earnings series is bundled. The indicator "
            "stays unavailable until a licensed CSV or URL is configured. Trailing P/E is never "
            "substituted and relabeled as forward P/E."
        ),
        order=2,
        transform="inverse_percentile",
        optional=True,
        unavailable_reason=(
            "Requires a licensed forward-earnings feed. Set FORWARD_PE_CSV_URL or import a "
            "licensed CSV. An external reference is available from "
            "historyofmarket.com S&P 500 Forward P/E (CC BY 4.0, display only, do not redistribute; "
            "external chart with attribution can be rendered client‑side)."
        ),
    ),
    "buffett": IndicatorDef(
        id="buffett",
        name="Buffett Indicator",
        short_name="Buffett Indicator",
        description="U.S. listed equity market capitalization as a percentage of nominal GDP.",
        section="valuation",
        category="fundamental",
        unit="%",
        value_kind="percent",
        frequency="Annual",
        source_name="World Bank (market capitalization of listed domestic companies / GDP)",
        source_url=(
            "https://api.worldbank.org/v2/country/USA/indicator/CM.MKT.LCAP.GD.ZS"
        ),
        methodology=(
            "Market capitalization of listed domestic companies as a percentage of GDP, as "
            "published by the World Bank from World Federation of Exchanges data. The series is "
            "shown as supplementary evidence and carries zero weight in the composite."
        ),
        limitations=(
            "Annual frequency with a substantial publication lag. Coverage is listed domestic "
            "companies, not every U.S.-listed issuer, and U.S. companies earn significant revenue "
            "abroad. It is supplementary evidence, not a timing tool or a fourth valuation vote."
        ),
        order=3,
        transform="inverse_percentile",
        supplementary=True,
    ),
    "erp": IndicatorDef(
        id="erp",
        name="Equity Risk Premium (proxy)",
        short_name="ERP proxy",
        description="An earnings-yield-based proxy for the compensation offered by equities over Treasuries.",
        section="valuation",
        category="relative",
        unit="pp",
        value_kind="percentage_points",
        frequency="Daily",
        source_name="Shiller earnings + U.S. Treasury 10-year yield",
        source_url="https://home.treasury.gov/resource-center/data-chart-center/interest-rates",
        methodology=(
            "Preferred method: forward earnings yield (1 / forward P/E) minus the 10-year U.S. "
            "Treasury yield. When no licensed forward P/E is available, the dashboard uses a "
            "clearly labeled trailing proxy: Shiller nominal trailing earnings divided by the "
            "S&P 500 price, minus the 10-year Treasury yield. Both legs are nominal."
        ),
        limitations=(
            "The fallback is an earnings-yield proxy, not a full expected-return model. It ignores "
            "growth, payout policy, buybacks, and risk premia embedded in forward estimates. The "
            "preferred forward-based version requires licensed forward earnings."
        ),
        order=4,
        transform="percentile",
    ),
    "fear_greed": IndicatorDef(
        id="fear_greed",
        name="CNN Fear & Greed Index",
        short_name="Fear & Greed",
        description="CNN Business's composite measure of market fear and greed, on a 0-100 scale.",
        section="sentiment",
        category="sentiment",
        unit="/100",
        value_kind="score",
        frequency="Daily",
        source_name="CNN Business (authorized feed required)",
        source_url="https://www.cnn.com/markets/fear-and-greed",
        methodology=(
            "CNN Fear & Greed Index on its published 0-100 scale. The component is contrarian: "
            "score = 100 - index. Fear can create opportunity but is not proof of undervaluation."
        ),
        limitations=(
            "No public authorized API is bundled. The indicator stays unavailable unless an "
            "authorized feed is configured. A separate VIX/RSI sentiment proxy is displayed and "
            "explicitly labeled; it is not substituted for CNN data."
        ),
        order=5,
        transform="inverse_level",
        optional=True,
        unavailable_reason=(
            "Requires an authorized CNN Fear & Greed feed. Set FEAR_GREED_CSV_URL or import a "
            "licensed CSV. An independent daily Fear & Greed index is available from "
            "FearGreedChart.com (free API, history from Oct 2016, CORS-enabled). "
            "A labeled VIX/RSI proxy is shown in the summary."
        ),
    ),
    "vix": IndicatorDef(
        id="vix",
        name="Cboe Volatility Index (VIX)",
        short_name="VIX",
        description="The options-implied expected 30-day volatility of the S&P 500.",
        section="sentiment",
        category="sentiment",
        unit="",
        value_kind="index",
        frequency="Daily",
        source_name="Cboe Global Markets",
        source_url="https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv",
        methodology=(
            "Cboe VIX closing level. The component is contrarian: higher VIX (more fear) maps to "
            "a higher score through an inverse historical percentile."
        ),
        limitations=(
            "Elevated VIX is not proof that equities are cheap. VIX measures implied volatility "
            "and can remain elevated during prolonged drawdowns. It is a supplementary sentiment "
            "and risk indicator."
        ),
        order=6,
        transform="inverse_percentile",
    ),
    "rsi": IndicatorDef(
        id="rsi",
        name="S&P 500 RSI (14-day)",
        short_name="RSI (14)",
        description="Wilder's 14-day Relative Strength Index of the S&P 500 price index.",
        section="sentiment",
        category="sentiment",
        unit="",
        value_kind="index",
        frequency="Daily",
        source_name="S&P 500 daily closes, Wilder RSI",
        source_url="https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC",
        methodology=(
            "Wilder's RSI with a 14-period lookback, computed from daily S&P 500 closing prices. "
            "The component is contrarian: lower RSI maps to a higher score through an inverse "
            "historical percentile. Conventional 30/70 reference levels are displayed."
        ),
        limitations=(
            "RSI is a price-momentum measure, not a fundamental valuation measure. It can remain "
            "oversold or overbought for extended periods. The 30/70 levels are conventions, not "
            "statistically validated thresholds."
        ),
        order=7,
        transform="inverse_percentile",
        thresholds=[{"value": 30, "label": "Oversold (convention)"}, {"value": 70, "label": "Overbought (convention)"}],
    ),
    "ma200_deviation": IndicatorDef(
        id="ma200_deviation",
        name="S&P 500 vs 200-day Moving Average",
        short_name="200-day trend",
        description="The percentage distance between the S&P 500 and its 200-trading-day simple moving average.",
        section="sentiment",
        category="sentiment",
        unit="%",
        value_kind="percent",
        frequency="Daily",
        source_name="S&P 500 daily closes, 200-day SMA",
        source_url="https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC",
        methodology=(
            "Percentage deviation of the S&P 500 close from its 200-trading-day simple moving "
            "average. The component is trend-oriented: higher deviation maps to a higher score "
            "through a historical percentile. A zero line marks the moving average."
        ),
        limitations=(
            "This is primarily a trend indicator, not a valuation measure. A market above its "
            "200-day average can still be expensive, and a market below it can still be cheap."
        ),
        order=8,
        transform="percentile",
        chart_kind="ma200",
        thresholds=[{"value": 0, "label": "At the 200-day average"}],
    ),
    "breadth_200dma": IndicatorDef(
        id="breadth_200dma",
        name="S&P 500 Constituents Above 200-day Average",
        short_name="Market breadth",
        description="The percentage of current S&P 500 constituents trading above their own 200-day averages.",
        section="breadth",
        category="breadth",
        unit="%",
        value_kind="percent",
        frequency="Daily",
        source_name="Current S&P 500 constituents + adjusted prices",
        source_url="https://github.com/datasets/s-and-p-500-companies",
        methodology=(
            "For each trading day, the percentage of the current S&P 500 constituent list whose "
            "adjusted close exceeds its own 200-trading-day simple moving average. The component "
            "is trend-oriented: higher breadth maps to a higher score through a historical percentile."
        ),
        limitations=(
            "Current constituents are used for the whole history, so the series has survivorship "
            "bias and is not a fully representative point-in-time history. History is limited to "
            "the configured lookback (six years by default). Adjusted closes are used for splits "
            "and distributions. This is a breadth condition, not a valuation measure."
        ),
        order=9,
        transform="percentile",
    ),
    "ew_cw_relative": IndicatorDef(
        id="ew_cw_relative",
        name="Equal-weight vs Cap-weight S&P 500",
        short_name="Equal-weight breadth",
        description="Cumulative relative performance of the equal-weighted S&P 500 versus the cap-weighted index.",
        section="breadth",
        category="breadth",
        unit="",
        value_kind="ratio",
        frequency="Daily",
        source_name="RSP and SPY adjusted closes (total-return proxy)",
        source_url="https://query1.finance.yahoo.com/v8/finance/chart/RSP",
        methodology=(
            "The ratio of RSP (Invesco S&P 500 Equal Weight ETF) adjusted close to SPY "
            "(SPDR S&P 500 ETF Trust) adjusted close. Both series are normalized to 100 at their "
            "first common date for cumulative performance. The score uses the historical "
            "percentile of the 252-trading-day change in the ratio. Higher values indicate "
            "broader participation; the signal is not independently sufficient to establish overvaluation."
        ),
        limitations=(
            "Adjusted ETF closes approximate total return with distributions reinvested; they are "
            "not an official total-return index. RSP inception is 2003. The ratio reflects "
            "concentration in large caps but has many other drivers."
        ),
        order=10,
        transform="percentile",
        chart_kind="relative",
    ),
}

SECTION_LABELS = {
    "valuation": "Valuation",
    "sentiment": "Sentiment & momentum",
    "breadth": "Market breadth",
}

CATEGORY_LABELS = {
    "fundamental": "Fundamental valuation",
    "relative": "Relative attractiveness",
    "sentiment": "Sentiment & momentum",
    "breadth": "Market breadth",
}

CATEGORY_DESCRIPTIONS = {
    "fundamental": "Long-term valuation relative to earnings.",
    "relative": "Compensation offered by equities versus Treasuries.",
    "sentiment": "Short-term fear, volatility, momentum, and trend conditions.",
    "breadth": "Participation and concentration inside the index.",
}

CATEGORY_ORDER = ["fundamental", "relative", "sentiment", "breadth"]

VALUATION_BANDS = [
    {"key": "very_overvalued", "label": "Very Overvalued", "min": 0, "max": 20, "color": "#e06c75"},
    {"key": "overvalued", "label": "Overvalued", "min": 20, "max": 40, "color": "#e39a5c"},
    {"key": "neutral", "label": "Neutral", "min": 40, "max": 60, "color": "#d8c07a"},
    {"key": "undervalued", "label": "Undervalued", "min": 60, "max": 80, "color": "#6fcfb2"},
    {"key": "very_undervalued", "label": "Very Undervalued", "min": 80, "max": 100, "color": "#4fb98a"},
]


def classify_valuation(score: float | None) -> dict:
    if score is None:
        return {"key": "unavailable", "label": "Insufficient data", "color": "#8b9aa8"}
    if score < 20:
        band = VALUATION_BANDS[0]
    elif score < 40:
        band = VALUATION_BANDS[1]
    elif score < 60:
        band = VALUATION_BANDS[2]
    elif score < 80:
        band = VALUATION_BANDS[3]
    else:
        band = VALUATION_BANDS[4]
    return {"key": band["key"], "label": band["label"], "color": band["color"]}


def classify_conditions(score: float | None) -> dict:
    if score is None:
        return {"key": "unavailable", "label": "Insufficient data", "color": "#8b9aa8"}
    if score < 40:
        return {"key": "unfavorable", "label": "Unfavorable", "color": "#e06c75"}
    if score < 60:
        return {"key": "mixed", "label": "Mixed", "color": "#d8c07a"}
    return {"key": "supportive", "label": "Supportive", "color": "#6fcfb2"}


def format_value(value: float | None, value_kind: str, unit: str = "") -> str:
    if value is None:
        return "—"
    if value_kind == "multiple":
        return f"{value:,.1f}x"
    if value_kind == "percent":
        return f"{value:,.1f}%"
    if value_kind == "percentage_points":
        return f"{value:+.2f} pp"
    if value_kind == "score":
        return f"{value:,.0f}{unit}"
    if value_kind == "ratio":
        return f"{value:,.3f}"
    return f"{value:,.2f}"
