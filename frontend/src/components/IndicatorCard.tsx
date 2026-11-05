import { useMemo } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { sparklineOption } from "../charts";
import { useIndicatorHistory } from "../hooks";
import { LOCALE_TEXT } from "../i18n";
import type { LocaleKey } from "../i18n";
import type { Indicator, ThemeMode } from "../types";
import {
  categoryColor,
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

interface IndicatorCardProps {
  indicator: Indicator;
  theme: ThemeMode;
  locale: LocaleKey;
  onOpen: (indicator: Indicator) => void;
}

export function IndicatorCard({ indicator, theme, locale, onOpen }: IndicatorCardProps) {
  const text = LOCALE_TEXT[locale];
  const available = Boolean(indicator.latest);
  const history = useIndicatorHistory(indicator.id, "10y", available);
  const score = indicator.score?.score ?? null;
  const color = scoreColor(score);
  const accent = categoryColor(indicator.category);
  const quality = qualityLabels(indicator.score?.quality, locale).slice(0, 2);
  const option = useMemo(
    () => (history.data ? sparklineOption(history.data.points, indicator, theme) : null),
    [history.data, indicator, theme],
  );

  const localized = text.indicatorLocales[indicator.id];
  const displayName = localized?.short ?? indicator.short_name;
  const fullName = localized?.name ?? indicator.name;
  const categoryLabel =
    text.category_labels[indicator.category as keyof typeof text.category_labels] ??
    indicator.category_label;
  const ariaLabel = `${fullName}. ${
    available ? `${text.as_of_card} ${indicator.latest?.display}` : text.no_observation
  }. ${text.aria_open_details}`;

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(indicator);
    }
  };

  return (
    <article
      className={`indicator-card ${available ? "" : "is-unavailable"}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(indicator)}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      style={{ "--indicator-accent": accent } as CSSProperties}
    >
      <div className="indicator-card-top">
        <div className="indicator-title">
          <span className="indicator-name">{displayName}</span>
          <span className="indicator-category" style={{ color: accent }}>
            {categoryLabel}
          </span>
        </div>
        <div className="indicator-badges">
          {indicator.supplementary && <span className="tiny-badge">{text.zero_weight}</span>}
          {indicator.pending_estimate && (
            <span className="tiny-badge tiny-badge-warn">{text.preliminary}</span>
          )}
          <span
            className="status-dot"
            style={{ background: statusColor(indicator.status) }}
            title={statusLabel(indicator.status, locale)}
          />
        </div>
      </div>

      <div className="indicator-value-row">
        <div>
          <div className="indicator-value">{indicator.latest?.display ?? "—"}</div>
          <div className="indicator-date">
            {indicator.latest
              ? `${text.as_of_card} ${formatDate(indicator.latest.date, locale)}`
              : text.no_observation}
          </div>
        </div>
        {score !== null ? (
          <span
            className="score-badge"
            style={{
              color,
              background: hexToRgba(color, 0.11),
              borderColor: hexToRgba(color, 0.32),
            }}
          >
            {formatScore(score)}
          </span>
        ) : (
          <span className="score-badge score-badge-empty">—</span>
        )}
      </div>

      <div className="indicator-spark">
        {available && option ? (
          <Chart
            option={option}
            height={78}
            ariaLabel={`${displayName} ${locale === "kr" ? "히스토리" : "history"}`}
          />
        ) : available && history.loading ? (
          <div className="spark-skeleton" />
        ) : available && history.error ? (
          <div className="spark-placeholder">{text.history_unavailable}</div>
        ) : (
          <div className="spark-placeholder">
            <span className="feed-lock">{text.feed_required}</span>
            <span>{indicator.optional ? text.authorized_not_configured : text.no_observation}</span>
          </div>
        )}
      </div>

      <div className="indicator-stats">
        <span>
          {text.percentile}{" "}
          <strong>
            {indicator.score?.percentile !== null && indicator.score?.percentile !== undefined
              ? text.percentile_th(Math.round(indicator.score.percentile))
              : text.direct_scale_word}
          </strong>
        </span>
        <span>
          {text.window}{" "}
          <strong>
            {indicator.score?.window_years_used !== null &&
            indicator.score?.window_years_used !== undefined
              ? `${formatNumber(indicator.score.window_years_used, 1)}${text.years_suffix_short}`
              : "—"}
          </strong>
        </span>
        {indicator.scored && indicator.latest?.is_estimate && (
          <span className="indicator-scored">
            {text.scored} <strong>{indicator.scored.display}</strong>
          </span>
        )}
      </div>

      <div className="indicator-foot">
        <span className="indicator-weight">
          {indicator.weight > 0
            ? text.weight_of_category(
                Math.round(indicator.weight * 100),
                categoryLabel,
              )
            : text.supplementary}
        </span>
        <span className="indicator-quality">
          {quality.length > 0 ? quality.join(" · ") : statusLabel(indicator.status, locale)}
        </span>
        <span className="open-arrow" aria-hidden="true">
          ↗
        </span>
      </div>
    </article>
  );
}
