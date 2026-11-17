import { useEffect, useState } from "react";
import type { IndexKey } from "../api";
import { fetchValidation } from "../api";
import { buildGauges, DIP_IDS } from "../dipCheck";
import type { Gauge } from "../dipCheck";
import { sparklineOption } from "../charts";
import { useSparklines } from "../hooks";
import type { LocaleKey } from "../i18n";
import type { Dashboard, Indicator, ThemeMode, ValidationPayload } from "../types";
import { formatDate, formatNumber } from "../utils";
import { Chart } from "./Chart";

interface DipCheckProps {
  dashboard: Dashboard;
  index: IndexKey;
  locale: LocaleKey;
  theme: ThemeMode;
  onOpen: (indicator: Indicator) => void;
}

const HEADING: Record<
  LocaleKey,
  { eyebrow: string; title: string; sub: (name: string) => string; asOf: string; open: string; dipFirst: string; advisory: string }
> = {
  en: {
    eyebrow: "Dip check",
    title: "Is this a dip?",
    sub: (name) => `Four readings of how stressed the ${name} is right now, in plain language.`,
    asOf: "As of",
    open: "Open chart",
    dipFirst: "More dip-like toward the top",
    advisory:
      "Not investment advice. These readings describe stress, not a verdict — only you can decide what a dip means for your portfolio.",
  },
  kr: {
    eyebrow: "하락 구간 점검",
    title: "지금이 눌림목일까요?",
    sub: (name) => `${name}이 지금 얼마나 불안한지 네 가지 지표를 쉬운 말로 보여줍니다.`,
    asOf: "기준",
    open: "차트 보기",
    dipFirst: "위로 갈수록 저점권에 가까운 순서입니다",
    advisory:
      "투자 조언이 아닙니다. 이 지표들은 불안의 정도를 보여줄 뿐 ‘지금 사라’는 답이 아니며, 판단과 책임은 본인에게 있습니다.",
  },
};

const BUCKET_LABEL: Record<string, Record<LocaleKey, string>> = {
  Undervalued: { en: "Undervalued", kr: "저평가" },
  Neutral: { en: "Neutral", kr: "중립" },
  Overvalued: { en: "Overvalued", kr: "고평가" },
  "Very Overvalued": { en: "Very overvalued", kr: "매우 고평가" },
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
  theme,
  sparkline,
  onOpen,
}: {
  gauge: Gauge;
  indicator: Indicator | undefined;
  locale: LocaleKey;
  theme: ThemeMode;
  sparkline: Array<{ date: string; value: number | null }> | undefined;
  onOpen: (indicator: Indicator) => void;
}) {
  const copy = HEADING[locale];
  const sparkOption =
    theme && indicator && sparkline && sparkline.filter((point) => point.value !== null).length >= 2
      ? sparklineOption(sparkline, indicator, theme)
      : null;
  const body = (
    <>
      <div className="dip-card-head">
        <span className="dip-title">{gauge.title}</span>
        {gauge.available && <Meter level={gauge.level} locale={locale} />}
      </div>
        {sparkOption && (
          <div className="dip-spark" aria-hidden="true">
            <Chart option={sparkOption} height={46} ariaLabel={`${gauge.title} sparkline`} />
          </div>
        )}
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

export function DipCheck({ dashboard, index, locale, theme, onOpen }: DipCheckProps) {
  const copy = HEADING[locale];
  const name = index === "nasdaq" ? (locale === "kr" ? "나스닥" : "NASDAQ") : "S&P 500";
  const gauges = buildGauges(dashboard.indicators, dashboard.trend ?? null, index, locale);
  const byId = new Map(dashboard.indicators.map((indicator) => [indicator.id, indicator]));
  const sparklines = useSparklines(index);
  const [validation, setValidation] = useState<ValidationPayload | null>(null);

  useEffect(() => {
    if (index !== "sp500") {
      setValidation(null);
      return;
    }
    const controller = new AbortController();
    fetchValidation(controller.signal)
      .then((payload) => {
        if (!controller.signal.aborted) setValidation(payload);
      })
      .catch(() => {
        // Backtest strip is optional; never surface an error for it.
      });
    return () => controller.abort();
  }, [index]);

  const bucket = (() => {
    if (index !== "sp500" || !validation?.horizons?.["1y"]?.by_classification) return null;
    const key = (dashboard.overall?.classification_key ?? "").replace(/_/g, " ").toLowerCase();
    return (
      validation.horizons["1y"].by_classification.find(
        (item) => item.classification.toLowerCase() === key,
      ) ?? null
    );
  })();

  return (
    <section className="panel dip-panel" id="dip-check">
      <div className="panel-head">
        <div>
          <div className="eyebrow">{copy.eyebrow}</div>
          <h1>{copy.title}</h1>
          <p className="panel-sub">{copy.sub(name)}</p>
          <p className="dip-advisory" role="note">{copy.advisory}</p>
          {bucket && (
            <p className="dip-backtest" role="note">
              {locale === "kr" ? (
                <>
                  현재와 같은 분류(<strong>{BUCKET_LABEL[bucket.classification]?.kr ?? bucket.classification}</strong>)였던 과거 {bucket.n}회: 1년 후 평균{" "}
                  <strong>{formatNumber((bucket.mean_price_return ?? 0) * 100, 1)}%</strong> · 상승 확률{" "}
                  <strong>{formatNumber((bucket.positive_rate ?? 0) * 100, 1)}%</strong>{" "}
                  <a href={locale === "kr" ? "/ko/methodology" : "/methodology"}>S&amp;P 500 백테스트 · 방법론</a>
                </>
              ) : (
                <>
                  Historically, after{" "}
                  <strong>{BUCKET_LABEL[bucket.classification]?.en ?? bucket.classification}</strong> readings (n=
                  {bucket.n}): 1Y average{" "}
                  <strong>{formatNumber((bucket.mean_price_return ?? 0) * 100, 1)}%</strong> · positive{" "}
                  <strong>{formatNumber((bucket.positive_rate ?? 0) * 100, 1)}%</strong> of the time{" "}
                  <a href="/methodology">S&amp;P 500 backtest · methodology</a>
                </>
              )}
            </p>
          )}
        </div>
      </div>
      <div className="dip-grid">
        {gauges.map((gauge) => (
          <GaugeCard
            key={gauge.id}
            gauge={gauge}
            indicator={byId.get(gauge.id)}
            locale={locale}
            theme={theme}
            sparkline={sparklines.data?.points[gauge.id]}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

export { DIP_IDS };
