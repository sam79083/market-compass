import type { IndexKey } from "../api";
import { buildGauges, DIP_IDS, GUIDE_TEXT } from "../dipCheck";
import type { Gauge } from "../dipCheck";
import type { LocaleKey } from "../i18n";
import type { Dashboard, Indicator } from "../types";
import { formatDate } from "../utils";

interface DipCheckProps {
  dashboard: Dashboard;
  index: IndexKey;
  locale: LocaleKey;
  onOpen: (indicator: Indicator) => void;
}

const HEADING: Record<LocaleKey, { eyebrow: string; title: string; sub: (name: string) => string; asOf: string; open: string; dipFirst: string }> = {
  en: {
    eyebrow: "Dip check",
    title: "Is this a dip?",
    sub: (name) => `Four readings of how stressed the ${name} is right now, in plain language.`,
    asOf: "As of",
    open: "Open chart",
    dipFirst: "More dip-like toward the top",
  },
  kr: {
    eyebrow: "하락 구간 점검",
    title: "지금이 눌림목일까요?",
    sub: (name) => `${name}이 지금 얼마나 불안한지 네 가지 지표를 쉬운 말로 보여줍니다.`,
    asOf: "기준",
    open: "차트 보기",
    dipFirst: "위로 갈수록 저점권에 가까운 순서입니다",
  },
};

const LEVEL_WORD: Record<LocaleKey, string[]> = {
  en: ["Not dip-like", "Mild", "Clear", "Extreme"],
  kr: ["하락 구간 아님", "약함", "뚜렷함", "극단적"],
};

function Meter({ level, locale }: { level: number; locale: LocaleKey }) {
  return (
    <span className="dip-meter" role="img" aria-label={LEVEL_WORD[locale][level]}>
      {[1, 2, 3].map((step) => (
        <i key={step} className={step <= level ? "dip-dot is-on" : "dip-dot"} />
      ))}
      <span className="dip-meter-word">{LEVEL_WORD[locale][level]}</span>
    </span>
  );
}

/** Splits a criteria line like "30~40: 매도가 강하고…" into a bolded range and the explanation. */
function RangeLine({ text }: { text: string }) {
  const cut = text.indexOf(":");
  if (cut <= 0) return <>{text}</>;
  return (
    <>
      <span className="dip-criteria-range">{text.slice(0, cut)}</span>
      {text.slice(cut)}
    </>
  );
}

function GaugeCard({
  gauge,
  indicator,
  locale,
  onOpen,
}: {
  gauge: Gauge;
  indicator: Indicator | undefined;
  locale: LocaleKey;
  onOpen: (indicator: Indicator) => void;
}) {
  const copy = HEADING[locale];
  const body = (
    <>
      <div className="dip-card-head">
        <span className="dip-title">{gauge.title}</span>
        {gauge.available && <Meter level={gauge.level} locale={locale} />}
      </div>
      <div className="dip-state" data-level={gauge.level}>
        {gauge.state}
      </div>
      <div className="dip-headline">{gauge.headline}</div>
      {gauge.criteria.length > 0 ? (
        <div className="dip-criteria">
          <p className="dip-criteria-hint">{copy.dipFirst}</p>
          {gauge.criteria.map((criterion) => (
            <div
              key={criterion.key}
              className={
                criterion.key === gauge.currentKey
                  ? "dip-criteria-item is-current"
                  : "dip-criteria-item"
              }
            >
              <RangeLine text={criterion.text} />
            </div>
          ))}
        </div>
      ) : (
        <p className="dip-detail">{gauge.detail}</p>
      )}
      {gauge.context && <p className="dip-context">{gauge.context}</p>}
      <div className="dip-foot">
        {gauge.asOf && (
          <span>
            {copy.asOf} {formatDate(gauge.asOf, locale)}
          </span>
        )}
        {gauge.available && indicator && <span className="dip-open">{copy.open} ↗</span>}
      </div>
    </>
  );
  if (!gauge.available || !indicator) return <div className="dip-card is-empty">{body}</div>;
  return (
    <button type="button" className="dip-card" onClick={() => onOpen(indicator)}>
      {body}
    </button>
  );
}

export function DipCheck({ dashboard, index, locale, onOpen }: DipCheckProps) {
  const copy = HEADING[locale];
  const name = index === "nasdaq" ? (locale === "kr" ? "나스닥" : "NASDAQ") : "S&P 500";
  const gauges = buildGauges(dashboard.indicators, dashboard.trend ?? null, index, locale);
  const byId = new Map(dashboard.indicators.map((indicator) => [indicator.id, indicator]));

  return (
    <section className="panel dip-panel" id="dip-check">
      <div className="panel-head">
        <div>
          <div className="eyebrow">{copy.eyebrow}</div>
          <h1>{copy.title}</h1>
          <p className="panel-sub">{copy.sub(name)}</p>
        </div>
      </div>
      <div className="dip-grid">
        {gauges.map((gauge) => (
          <GaugeCard
            key={gauge.id}
            gauge={gauge}
            indicator={byId.get(gauge.id)}
            locale={locale}
            onOpen={onOpen}
          />
        ))}
      </div>
      <p className="dip-disclaimer">{GUIDE_TEXT[locale].disclaimer}</p>
    </section>
  );
}

export { DIP_IDS };
