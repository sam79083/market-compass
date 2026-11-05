import { useEffect, useMemo, useState } from "react";
import { validationUrl, fetchMethodology } from "../api";
import { LOCALE_TEXT } from "../i18n";
import type { LocaleKey } from "../i18n";
import type { Methodology, ReturnStats, ValidationPayload } from "../types";
import {
  categoryColor,
  formatCoverage,
  formatDate,
  formatNumber,
  formatPercent,
  formatScore,
} from "../utils";

interface MethodologyModalProps {
  onClose: () => void;
  locale?: LocaleKey;
}

function stat(value: number | null | undefined, digits = 2): string {
  return formatPercent(value, digits);
}

function HorizonTable({
  validation,
  field,
  locale,
}: {
  validation: ValidationPayload;
  field: "price" | "total_return" | "real_price" | "real_total_return";
  locale: LocaleKey;
}) {
  const text = LOCALE_TEXT[locale].methodology_modal;
  const horizons = ["3m", "1y", "3y", "5y"];
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>{text.table_horizon}</th>
            <th>{text.table_n}</th>
            <th>{text.table_mean}</th>
            <th>{text.table_median}</th>
            <th>{text.table_positive}</th>
            <th>{text.table_spearman}</th>
          </tr>
        </thead>
        <tbody>
          {horizons.map((horizon) => {
            const payload = validation.horizons[horizon];
            const stats: ReturnStats | undefined = payload?.composite?.[field];
            return (
              <tr key={horizon}>
                <td>{horizon.toUpperCase()}</td>
                <td>{stats?.n ?? 0}</td>
                <td>{stat(stats?.mean)}</td>
                <td>{stat(stats?.median)}</td>
                <td>{stat(stats?.positive_rate, 1)}</td>
                <td>{formatNumber(stats?.spearman, 3)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function MethodologyModal({ onClose, locale = "kr" }: MethodologyModalProps) {
  const text = LOCALE_TEXT[locale];
  const methodologyText = text.methodology_modal;
  const [data, setData] = useState<Methodology | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchMethodology(controller.signal)
      .then((payload) => setData(payload))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Failed");
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const indicators = useMemo(
    () => new Map((data?.indicators ?? []).map((indicator) => [indicator.id, indicator])),
    [data],
  );
  const validation = data?.validation ?? null;

  const localizeClassification = (value: string): string => {
    const key = LOCALE_TEXT.en.classification_from_en[value] ?? value;
    return text.band_labels[key as keyof typeof text.band_labels] ?? value;
  };

  const localizeBand = (band: { key: string; label: string }): string =>
    text.band_labels[band.key as keyof typeof text.band_labels] ?? band.label;

  const localizeCategory = (
    key: string,
    fallbackLabel: string,
  ): string =>
    text.category_labels[key as keyof typeof text.category_labels] ?? fallbackLabel;


  const localizeIndicatorShort = (id: string): string =>
    text.indicatorLocales[id]?.short ??
    indicators.get(id)?.short_name ??
    id.replaceAll("_", " ");

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal methodology-modal" role="dialog" aria-modal="true" aria-labelledby="methodology-title">
        <header className="modal-head">
          <div>
            <div className="eyebrow">{methodologyText.eyebrow}</div>
            <h2 id="methodology-title">{methodologyText.title}</h2>
            <div className="modal-subhead">
              <span>{methodologyText.weights_hash(data?.weights_hash ?? "—")}</span>
              <span>{methodologyText.updated(data ? formatDate(data.generated_at, locale) : "—")}</span>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={methodologyText.close_aria}>
            ×
          </button>
        </header>

        {error ? (
          <div className="chart-empty">{methodologyText.load_error} {error}</div>
        ) : !data ? (
          <div className="chart-skeleton chart-skeleton-large" />
        ) : (
          <div className="methodology-body">
            <section className="methodology-section">
              <h3>{methodologyText.how_built}</h3>
              <p className="methodology-lead">{methodologyText.score_method}</p>
              <div className="band-table">
                {data.bands.map((band) => (
                  <div key={band.key} className="band-table-row">
                    <span className="band-swatch" style={{ background: band.color }} />
                    <span>{localizeBand(band)}</span>
                    <strong>
                      {band.min}–{band.max}
                    </strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="methodology-section">
              <h3>{methodologyText.weights}</h3>
              <div className="weight-overall">
                {data.categories.map((category) => (
                  <div className="weight-pill" key={category.key}>
                    <span className="weight-dot" style={{ background: categoryColor(category.key) }} />
                    <span>{localizeCategory(category.key, category.label)}</span>
                    <strong>{Math.round(category.weight * 100)}%</strong>
                  </div>
                ))}
              </div>
              <div className="weight-groups">
                {data.categories.map((category) => {
                  const mapping = (data.weights[category.key] ?? {}) as Record<string, number>;
                  const entries = Object.entries(mapping).sort((left, right) => right[1] - left[1]);
                  return (
                    <div className="weight-group" key={category.key}>
                      <h4 style={{ color: categoryColor(category.key) }}>
                        {localizeCategory(category.key, category.label)}
                      </h4>
                      {entries.map(([id, weight]) => {
                        const indicator = indicators.get(id);
                        return (
                          <div className="weight-row" key={id}>
                            <span>
                              {localizeIndicatorShort(id)}
                              {indicator?.supplementary && (
                                <em> · {methodologyText.supplementary_word}</em>
                              )}
                            </span>
                            <strong>{Math.round(weight * 100)}%</strong>
                            <small>
                              {indicator
                                ? `${
                                    text.transform_labels[
                                      indicator.transform as keyof typeof text.transform_labels
                                    ] ?? indicator.transform.replaceAll("_", " ")
                                  } · ${indicator.window_years}${text.years_suffix_short} ${
                                    locale === "kr" ? "창" : "window"
                                  }`
                                : ""}
                            </small>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <p className="methodology-note">
                {methodologyText.weights_note(
                  formatCoverage(data.weights.minimum_coverage),
                  String(data.weights.minimum_categories),
                )}
              </p>
            </section>

            <section className="methodology-section">
              <h3>{methodologyText.data_sources}</h3>
              <div className="source-grid">
                {data.sources.map((source) => (
                  <article className="source-card" key={source.id}>
                    <div className="source-head">
                      <h4>{text.source_names[source.id] ?? source.name}</h4>
                      <span>{text.frequencies[source.frequency] ?? source.frequency}</span>
                    </div>
                    <p className="source-used">
                      {methodologyText.used_for}
                      {source.used_for
                        .map((item) => text.used_for_map[item] ?? item)
                        .join(", ")}
                    </p>
                    <p>{text.source_limitations[source.id] ?? source.limitations}</p>
                    {source.url && (
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {methodologyText.open_source}
                      </a>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <section className="methodology-section">
              <h3>{methodologyText.validation}</h3>
              {validation ? (
                <>
                  <p className="methodology-lead">
                    {methodologyText.validation_intro(
                      validation.n_scores,
                      formatDate(validation.start, locale),
                      formatDate(validation.end, locale),
                    )}
                  </p>
                  <h4>{methodologyText.h_price_return}</h4>
                  <HorizonTable validation={validation} field="price" locale={locale} />
                  <h4>{methodologyText.h_real_total_return}</h4>
                  <HorizonTable validation={validation} field="real_total_return" locale={locale} />
                  <h4>{methodologyText.h_window_sensitivity}</h4>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{methodologyText.table_window}</th>
                          <th>{methodologyText.table_composite}</th>
                          <th>{methodologyText.table_coverage}</th>
                          <th>{methodologyText.table_classification}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(validation.window_sensitivity.windows).map(([window, result]) => (
                          <tr key={window}>
                            <td>{`${window}${text.years_suffix}`}</td>
                            <td>{formatScore(result.score)}</td>
                            <td>{formatCoverage(result.coverage)}</td>
                            <td>{localizeClassification(result.classification)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <h4>{methodologyText.h_out_of_sample}</h4>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{methodologyText.table_period}</th>
                          <th>{methodologyText.table_1y_mean}</th>
                          <th>{methodologyText.table_1y_positive}</th>
                          <th>{methodologyText.table_1y_n}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(validation.out_of_sample).map(([period, horizons]) => {
                          const stats = horizons["1y"]?.composite?.price;
                          return (
                            <tr key={period}>
                              <td>
                                {period === "pre_2015"
                                  ? methodologyText.period_pre_2015
                                  : methodologyText.period_2015}
                              </td>
                              <td>{stat(stats?.mean)}</td>
                              <td>{stat(stats?.positive_rate, 1)}</td>
                              <td>{stats?.n ?? 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <h4>{methodologyText.h_validation_limitations}</h4>
                  <ul className="plain-list">
                    {validation.limitations.map((limitation) => (
                      <li key={limitation}>
                        {methodologyText.limitations_map[limitation] ?? limitation}
                      </li>
                    ))}
                  </ul>
                  <a
                    className="text-link"
                    href={validationUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {methodologyText.open_validation_json}
                  </a>
                </>
              ) : (
                <p className="methodology-lead">{methodologyText.no_validation_note}</p>
              )}
            </section>

            <section className="methodology-section">
              <h3>{methodologyText.quality_notes}</h3>
              <div className="quality-note-list">
                {Object.entries(data.quality_notes).map(([flag, note]) => (
                  <div className="quality-note" key={flag}>
                    <strong>
                      {text.flag_titles[flag] ??
                        (locale === "en"
                          ? flag.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
                          : flag.replaceAll("_", " "))}
                    </strong>
                    <p>{text.data_flag_notes[flag] ?? note}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="methodology-section disclaimer-section">
              <h3>{methodologyText.disclaimer}</h3>
              <p>{text.footer}</p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
