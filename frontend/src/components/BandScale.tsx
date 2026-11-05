import type { Band } from "../types";
import type { LocaleKey } from "../i18n";
import { LOCALE_TEXT } from "../i18n";
import { clamp } from "../utils";

interface BandScaleProps {
  bands: Band[];
  score?: number | null;
  locale?: LocaleKey;
}

export function BandScale({ bands, score, locale = "en" }: BandScaleProps) {
  const text = LOCALE_TEXT[locale];
  return (
    <div className="band-scale" aria-hidden="true">
      <div className="band-track">
        {bands.map((band) => {
          const label =
            text.band_labels[band.key as keyof typeof text.band_labels] ?? band.label;
          return (
            <span
              key={band.key}
              className="band-segment"
              style={{ flex: band.max - band.min, background: band.color }}
              title={`${label}: ${band.min}–${band.max}`}
            />
          );
        })}
        {score !== null && score !== undefined && Number.isFinite(score) && (
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
