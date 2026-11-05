import { useMemo } from "react";
import { gaugeOption } from "../charts";
import type { Band, Overall, ThemeMode } from "../types";
import { formatCoverage, formatScore } from "../utils";
import { BandScale } from "./BandScale";
import { Chart } from "./Chart";

interface ScoreDialProps {
  overall: Overall;
  bands: Band[];
}

export function ScoreDial({ overall, bands }: ScoreDialProps) {
  const option = useMemo(() => gaugeOption(overall.score, "dark" as ThemeMode), [overall.score]);
  const flagCount = overall.quality_flags.length;

  return (
    <div className="score-dial">
      <div className="score-dial-chart">
        <Chart
          option={option}
          height={224}
          ariaLabel={`Composite valuation score ${formatScore(overall.score)} out of 100`}
        />
      </div>
      <div className="score-dial-label" style={{ color: overall.color }}>
        {overall.classification}
      </div>
      <BandScale bands={bands} score={overall.score} />
      <div className="score-dial-meta">
        <span>
          Coverage <strong>{formatCoverage(overall.coverage)}</strong>
        </span>
        <span className="meta-divider" />
        <span>
          Confidence <strong className={`confidence confidence-${overall.confidence}`}>{overall.confidence}</strong>
        </span>
        {flagCount > 0 && (
          <>
            <span className="meta-divider" />
            <span>
              <strong>{flagCount}</strong> note{flagCount === 1 ? "" : "s"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
