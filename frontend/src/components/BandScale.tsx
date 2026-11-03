import type { Band } from "../types";
import { clamp } from "../utils";

interface BandScaleProps {
  bands: Band[];
  score: number | null;
}

export function BandScale({ bands, score }: BandScaleProps) {
  return (
    <div className="band-scale" aria-hidden="true">
      <div className="band-track">
        {bands.map((band) => (
          <span
            key={band.key}
            className="band-segment"
            style={{ flex: band.max - band.min, background: band.color }}
            title={`${band.label}: ${band.min}–${band.max}`}
          />
        ))}
        {score !== null && (
          <span
            className="band-marker"
            style={{ left: `${clamp(score, 0, 100)}%` }}
          />
        )}
      </div>
      <div className="band-labels">
        <span>0</span>
        <span>20</span>
        <span>40</span>
        <span>60</span>
        <span>80</span>
        <span>100</span>
      </div>
    </div>
  );
}
