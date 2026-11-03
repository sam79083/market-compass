import { formatCoverage, formatScore, hexToRgba } from "../utils";

interface SignalCardProps {
  label: string;
  value: string;
  detail?: string;
  score?: number | null;
  coverage?: number | null;
  color?: string;
  accent?: string;
}

export function SignalCard({
  label,
  value,
  detail,
  score,
  coverage,
  color = "#d8b26a",
  accent,
}: SignalCardProps) {
  const barColor = accent ?? color;
  return (
    <div className="signal-card">
      <div className="signal-card-head">
        <span className="signal-label">{label}</span>
        {score !== undefined && score !== null && (
          <span className="signal-score" style={{ color }}>
            {formatScore(score)}
          </span>
        )}
      </div>
      <div className="signal-value" style={{ color }}>
        {value}
      </div>
      {score !== undefined && score !== null && (
        <div className="signal-bar">
          <span
            style={{
              width: `${Math.max(2, Math.min(100, score))}%`,
              background: `linear-gradient(90deg, ${hexToRgba(barColor, 0.35)}, ${barColor})`,
            }}
          />
        </div>
      )}
      <div className="signal-detail">
        {detail}
        {coverage !== undefined && coverage !== null && (
          <span className="signal-coverage">Coverage {formatCoverage(coverage)}</span>
        )}
      </div>
    </div>
  );
}
