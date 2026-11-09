import { useEffect } from "react";
import { GUIDE_TEXT } from "../dipCheck";
import type { LocaleKey } from "../i18n";

interface DipGuideProps {
  locale: LocaleKey;
  onClose: () => void;
}

const ROWS: Record<LocaleKey, Array<{ name: string; bands: string }>> = {
  en: [
    { name: "Panic level (VIX / VXN)", bands: "Below 20 calm · 20-30 elevated · 30-40 high fear · above 40 extreme panic" },
    { name: "Oversold check (RSI, 14 days)", bands: "Above 70 overbought · 40-60 neutral · 30-40 getting oversold · below 30 oversold · below 20 deeply oversold" },
    { name: "200-day trend", bands: "Above +2% uptrend · within 2% testing the line · down to -10% pullback · below -10% bear territory" },
    { name: "Fear & Greed", bands: "24 or less extreme fear · 25-44 fear · 45-55 neutral · 56-75 greed · 76 or more extreme greed" },
  ],
  kr: [
    { name: "공포 수준 (VIX / VXN)", bands: "20 미만 안정 · 20~30 불안 · 30~40 높은 공포 · 40 초과 극단적 패닉" },
    { name: "과매도 점검 (RSI, 14일)", bands: "70 이상 과열 · 40~60 중립 · 30~40 과매도에 가까움 · 30 미만 과매도 · 20 미만 깊은 과매도" },
    { name: "200일 추세", bands: "+2% 초과 상승 추세 · 2% 이내 200일선 근처 · -10%까지 조정 · -10% 미만 약세장 구간" },
    { name: "공포·탐욕 지수", bands: "24 이하 극단적 공포 · 25~44 공포 · 45~55 중립 · 56~75 탐욕 · 76 이상 극단적 탐욕" },
  ],
};

export function DipGuide({ locale, onClose }: DipGuideProps) {
  const text = GUIDE_TEXT[locale];

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

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal dip-guide" role="dialog" aria-modal="true" aria-labelledby="dip-guide-title">
        <header className="modal-head">
          <div>
            <h2 id="dip-guide-title">{text.title}</h2>
            <p className="panel-sub">{text.intro}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={text.close}>
            ×
          </button>
        </header>
        <div className="dip-guide-body">
          <p>{text.levels}</p>
          <dl className="dip-guide-list">
            {ROWS[locale].map((row) => (
              <div key={row.name}>
                <dt>{row.name}</dt>
                <dd>{row.bands}</dd>
              </div>
            ))}
          </dl>
          <ul className="dip-guide-caveats">
            {text.caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
          <p className="dip-disclaimer">{text.disclaimer}</p>
        </div>
      </div>
    </div>
  );
}
