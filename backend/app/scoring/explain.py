from __future__ import annotations

from app.indicators import INDICATORS

DISCLAIMER = (
    "This dashboard is a historical relative-attractiveness summary, not a forecast, "
    "an intrinsic-value estimate, or an automated buy/sell signal. A low score is not a "
    "sell instruction and a high score is not a buy instruction."
)

DATA_NOTES = {
    "forward_pe_unavailable": (
        "Forward P/E is unavailable, so the fundamental valuation category currently relies on "
        "CAPE alone. Trailing P/E was not substituted."
    ),
    "fear_greed_unavailable": (
        "CNN Fear & Greed is unavailable because no authorized feed is configured. Sentiment "
        "uses VIX, RSI, and the 200-day trend; the summary's fear/greed label is a labeled VIX/RSI proxy."
    ),
    "erp_proxy": (
        "The equity risk premium is a trailing earnings-yield proxy, not a full expected-return model."
    ),
    "breadth_survivorship": (
        "Market breadth uses the current S&P 500 constituent list across history. The series is "
        "survivorship-biased and is not a fully representative point-in-time history."
    ),
    "short_percentile_window": (
        "One or more percentiles use a shorter window than the 20-year default because the "
        "available history is shorter. The component cards disclose the window actually used."
    ),
    "buffett_supplementary": (
        "The Buffett Indicator is displayed as supplementary evidence and carries zero weight in the composite."
    ),
    "direct_scale_component": (
        "CNN Fear & Greed, when available, is transformed directly (100 - index) rather than percentile-ranked."
    ),
}


def _meaning(component: dict) -> str:
    definition = INDICATORS.get(component["id"])
    category = definition.category if definition else "fundamental"
    score = component["score"]
    if category in {"fundamental", "relative"}:
        if score >= 60:
            return "relatively cheap versus its own history"
        if score <= 40:
            return "relatively expensive versus its own history"
        return "near the middle of its historical range"
    if category == "sentiment":
        if score >= 60:
            return "fearful or trend-supportive conditions"
        if score <= 40:
            return "complacent, overbought, or weak-trend conditions"
        return "mixed sentiment and trend conditions"
    if score >= 60:
        return "broad participation"
    if score <= 40:
        return "narrow participation"
    return "mixed participation"


def _factor_text(component: dict) -> str:
    definition = INDICATORS.get(component["id"])
    name = definition.short_name if definition else component["id"]
    percentile = component.get("percentile")
    window = component.get("window_years_used")
    if percentile is not None:
        window_text = f" over its {window:.1f}-year window" if window else ""
        return (
            f"{name} sits in the {percentile:.0f}th percentile{window_text} and scores "
            f"{component['score']:.0f}/100, {_meaning(component)}."
        )
    return f"{name} scores {component['score']:.0f}/100, {_meaning(component)}."


def _factor(component: dict, role: str) -> dict:
    definition = INDICATORS.get(component["id"])
    return {
        "id": component["id"],
        "name": definition.name if definition else component["id"],
        "short_name": definition.short_name if definition else component["id"],
        "score": component["score"],
        "percentile": component.get("percentile"),
        "role": role,
        "text": _factor_text(component),
    }


def build_explanation(composite: dict) -> dict:
    score = composite.get("score")
    classification = composite.get("classification", "Insufficient data")
    long_term = composite.get("long_term") or {}
    conditions = composite.get("conditions") or {}
    flags = composite.get("quality_flags") or []
    components = [
        component
        for component in composite.get("components", {}).values()
        if component.get("available") and not component.get("supplementary")
    ]
    components.sort(key=lambda item: item["score"], reverse=True)

    data_notes = [DATA_NOTES[flag] for flag in flags if flag in DATA_NOTES]
    conflicts: list[str] = []
    lt_score = long_term.get("score")
    cond_score = conditions.get("score")
    if lt_score is not None and cond_score is not None and abs(lt_score - cond_score) >= 25:
        if lt_score < cond_score:
            conflicts.append(
                "Long-term valuation is less attractive than current market conditions. "
                "The composite blends a weak valuation signal with more supportive conditions."
            )
        else:
            conflicts.append(
                "Long-term valuation is more attractive than current market conditions. "
                "The composite blends a stronger valuation signal with weaker conditions."
            )
    if score is not None and 40 <= score <= 60 and components:
        high = components[0]
        low = components[-1]
        if high["score"] - low["score"] >= 30:
            conflicts.append(
                f"The components disagree materially: {high['short_name']} scores "
                f"{high['score']:.0f}/100 while {low['short_name']} scores {low['score']:.0f}/100."
            )

    if score is None:
        headline = "Insufficient data for a composite assessment"
        body = (
            "The dashboard does not force a classification when coverage is below the configured "
            "minimum. Review the category scores and data notes below before drawing conclusions."
        )
        supporting: list[dict] = []
        contradicting: list[dict] = []
        supporting_label = "Supporting evidence"
        contradicting_label = "Contradicting evidence"
    else:
        headline = f"{classification} · {score:.0f}/100"
        if score < 40:
            support_role = "supports"
            contradiction_role = "contradicts"
            supporting = [_factor(component, support_role) for component in components[-2:]]
            supporting.reverse()
            contradicting = [_factor(component, contradiction_role) for component in components[:2]]
            supporting_label = "Supporting the overvalued assessment"
            contradicting_label = "Contradicting the overvalued assessment"
        elif score > 60:
            supporting = [_factor(component, "supports") for component in components[:2]]
            contradicting = [_factor(component, "contradicts") for component in components[-2:]]
            contradicting.reverse()
            supporting_label = "Supporting the undervalued assessment"
            contradicting_label = "Contradicting the undervalued assessment"
        else:
            supporting = [_factor(component, "cheap_side") for component in components[:2]]
            contradicting = [_factor(component, "expensive_side") for component in components[-2:]]
            contradicting.reverse()
            supporting_label = "Evidence on the cheaper side"
            contradicting_label = "Evidence on the expensive side"

        lt_text = (
            f"Long-term valuation reads {lt_score:.0f}/100 ({long_term.get('label', 'n/a')})"
            if lt_score is not None
            else "Long-term valuation is unavailable"
        )
        cond_text = (
            f"current market conditions read {cond_score:.0f}/100 ({conditions.get('label', 'n/a')})"
            if cond_score is not None
            else "current market conditions are unavailable"
        )
        body = (
            f"The composite score is {score:.0f}/100, in the {classification} band. "
            f"{lt_text}, while {cond_text}. The score summarizes historical relative "
            f"attractiveness across four categories; it is not an objective measure of intrinsic value."
        )

    return {
        "headline": headline,
        "body": body,
        "supporting_label": supporting_label,
        "contradicting_label": contradicting_label,
        "supporting": supporting,
        "contradicting": contradicting,
        "conflicts": conflicts,
        "data_notes": data_notes,
        "disclaimer": DISCLAIMER,
    }
