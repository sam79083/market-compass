import { useEffect, useMemo, useState } from "react";
import { validationUrl, fetchMethodology } from "../api";
import type { Methodology, ReturnStats, ValidationPayload } from "../types";
import {
  categoryColor,
  formatCoverage,
  formatDate,
  formatNumber,
  formatPercent,
  formatScore,
  titleCase,
} from "../utils";

interface MethodologyModalProps {
  onClose: () => void;
}

function stat(value: number | null | undefined, digits = 2): string {
  return formatPercent(value, digits);
}

function HorizonTable({
  validation,
  field,
}: {
  validation: ValidationPayload;
  field: "price" | "total_return" | "real_price" | "real_total_return";
}) {
  const horizons = ["3m", "1y", "3y", "5y"];
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Horizon</th>
            <th>N</th>
            <th>Mean</th>
            <th>Median</th>
            <th>Positive</th>
            <th>Spearman</th>
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

export function MethodologyModal({ onClose }: MethodologyModalProps) {
  const [data, setData] = useState<Methodology | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchMethodology(controller.signal)
      .then((payload) => setData(payload))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Could not load methodology");
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
            <div className="eyebrow">Transparency</div>
            <h2 id="methodology-title">Methodology &amp; validation</h2>
            <div className="modal-subhead">
              <span>Weights hash {data?.weights_hash ?? "—"}</span>
              <span>Updated {data ? formatDate(data.generated_at) : "—"}</span>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close methodology">
            ×
          </button>
        </header>

        {error ? (
          <div className="chart-empty">Could not load methodology: {error}</div>
        ) : !data ? (
          <div className="chart-skeleton chart-skeleton-large" />
        ) : (
          <div className="methodology-body">
            <section className="methodology-section">
              <h3>How the score is built</h3>
              <p className="methodology-lead">{data.score_method}</p>
              <div className="band-table">
                {data.bands.map((band) => (
                  <div key={band.key} className="band-table-row">
                    <span className="band-swatch" style={{ background: band.color }} />
                    <span>{band.label}</span>
                    <strong>
                      {band.min}–{band.max}
                    </strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="methodology-section">
              <h3>Weights</h3>
              <div className="weight-overall">
                {data.categories.map((category) => (
                  <div className="weight-pill" key={category.key}>
                    <span className="weight-dot" style={{ background: categoryColor(category.key) }} />
                    <span>{category.label}</span>
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
                      <h4 style={{ color: categoryColor(category.key) }}>{category.label}</h4>
                      {entries.map(([id, weight]) => {
                        const indicator = indicators.get(id);
                        return (
                          <div className="weight-row" key={id}>
                            <span>
                              {indicator?.short_name ?? titleCase(id)}
                              {indicator?.supplementary && <em> · supplementary</em>}
                            </span>
                            <strong>{Math.round(weight * 100)}%</strong>
                            <small>
                              {indicator ? `${indicator.transform.replaceAll("_", " ")} · ${indicator.window_years}y window` : ""}
                            </small>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <p className="methodology-note">
                Minimum coverage {formatCoverage(data.weights.minimum_coverage)} · minimum{" "}
                {data.weights.minimum_categories} categories. Missing components are renormalized inside
                their category and coverage is disclosed.
              </p>
            </section>

            <section className="methodology-section">
              <h3>Data sources</h3>
              <div className="source-grid">
                {data.sources.map((source) => (
                  <article className="source-card" key={source.id}>
                    <div className="source-head">
                      <h4>{source.name}</h4>
                      <span>{source.frequency}</span>
                    </div>
                    <p className="source-used">Used for: {source.used_for.join(", ")}</p>
                    <p>{source.limitations}</p>
                    {source.url && (
                      <a href={source.url} target="_blank" rel="noreferrer">
                        Open source ↗
                      </a>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <section className="methodology-section">
              <h3>Validation</h3>
              {validation ? (
                <>
                  <p className="methodology-lead">
                    {validation.n_scores} monthly scores from {formatDate(validation.start)} to{" "}
                    {formatDate(validation.end)}. Forward returns are measured from the score date;
                    overlapping windows mean effective sample sizes are smaller than the raw counts.
                  </p>
                  <h4>Composite score vs. forward price return</h4>
                  <HorizonTable validation={validation} field="price" />
                  <h4>Composite score vs. forward real total return</h4>
                  <HorizonTable validation={validation} field="real_total_return" />
                  <h4>Window sensitivity</h4>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Percentile window</th>
                          <th>Composite</th>
                          <th>Coverage</th>
                          <th>Classification</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(validation.window_sensitivity.windows).map(([window, result]) => (
                          <tr key={window}>
                            <td>{window} years</td>
                            <td>{formatScore(result.score)}</td>
                            <td>{formatCoverage(result.coverage)}</td>
                            <td>{result.classification}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <h4>Out-of-sample split</h4>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Period</th>
                          <th>1Y mean price return</th>
                          <th>1Y positive rate</th>
                          <th>1Y N</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(validation.out_of_sample).map(([period, horizons]) => {
                          const stats = horizons["1y"]?.composite?.price;
                          return (
                            <tr key={period}>
                              <td>{period === "pre_2015" ? "Before 2015" : "2015 onward"}</td>
                              <td>{stat(stats?.mean)}</td>
                              <td>{stat(stats?.positive_rate, 1)}</td>
                              <td>{stats?.n ?? 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <h4>Limitations of the validation</h4>
                  <ul className="plain-list">
                    {validation.limitations.map((limitation) => (
                      <li key={limitation}>{limitation}</li>
                    ))}
                  </ul>
                  <a
                    className="text-link"
                    href={validationUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open the raw validation JSON ↗
                  </a>
                </>
              ) : (
                <p className="methodology-lead">
                  No validation file is available yet. Run{" "}
                  <code>python -m app.cli refresh --validate</code> or{" "}
                  <code>python -m app.cli validate</code> to generate forward-return diagnostics.
                </p>
              )}
            </section>

            <section className="methodology-section">
              <h3>Data quality notes</h3>
              <div className="quality-note-list">
                {Object.entries(data.quality_notes).map(([flag, note]) => (
                  <div className="quality-note" key={flag}>
                    <strong>{titleCase(flag)}</strong>
                    <p>{note}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="methodology-section disclaimer-section">
              <h3>Disclaimer</h3>
              <p>{data.disclaimer}</p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
