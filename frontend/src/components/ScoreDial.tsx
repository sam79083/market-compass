import { useMemo } from "react";
import { gaugeOption } from "../charts";
import { LOCALE_TEXT } from "../i18n";
import type { LocaleKey } from "../i18n";
import type { Band, Overall, ThemeMode } from "../types";
import { formatCoverage, formatScore } from "../utils";
import { BandScale } from "./BandScale";
import { Chart } from "./Chart";

interface ScoreDialProps {
  overall: Overall;
  bands: Band[];
  locale: LocaleKey;
}

export function ScoreDial({ overall, bands, locale }: ScoreDialProps) {
  const text = LOCALE_TEXT[locale];
  const option = useMemo(
    () => gaugeOption(overall.score, "dark" as ThemeMode, locale),
    [overall.score, locale],
  );
  const flagCount = overall.quality_flags.length;

  const classificationKey =
    LOCALE_TEXT.en.classification_from_en[overall.classification] ??
    overall.classification_key;
  const classification =
    text.band_labels[classificationKey as keyof typeof text.band_labels] ??
    overall.classification;
  const confidenceValue =
    text.confidence_labels[overall.confidence as keyof typeof text.confidence_labels] ??
    overall.confidence;

  return (
    <div className="score-dial">
      <div className="score-dial-chart">
        <Chart
          option={option}
          height={224}
          ariaLabel={`${text.chart_labels.composite_gauge} ${formatScore(overall.score)}/100`}
        />
      </div>
      <div className="score-dial-label" style={{ color: overall.color }}>
        {classification}
      </div>
      <BandScale bands={bands} score={overall.score} locale={locale} />
      <div className="score-dial-meta">
        <span>
          {text.coverage_label} <strong>{formatCoverage(overall.coverage)}</strong>
        </span>
        <span className="meta-divider" />
        <span>
          {text.confidence_label}{" "}
          <strong className={`confidence confidence-${overall.confidence}`}>{confidenceValue}</strong>
        </span>
        {flagCount > 0 && (
          <>
            <span className="meta-divider" />
            <span>{text.notes_suffix(flagCount)}</span>
          </>
        )}
      </div>
    </div>
  );
}
