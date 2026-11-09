import type { IndexKey } from "./api";
import type { LocaleKey } from "./i18n";
import type { Indicator, TrendSummary } from "./types";

/** The only four readings the site shows. Order = display order. */
export const DIP_IDS = ["vix", "rsi", "ma200_deviation", "fear_greed"] as const;
export type DipId = (typeof DIP_IDS)[number];

/**
 * How much a reading looks like a market dip: 0 = not a dip, 1 = mild, 2 = clear, 3 = extreme.
 * It describes the reading, it is not advice to buy.
 */
export type DipLevel = 0 | 1 | 2 | 3;

export interface Gauge {
  id: DipId;
  title: string;
  /** Plain-language answer, e.g. "NASDAQ is 2.1% below its 200-day average". */
  headline: string;
  state: string;
  level: DipLevel;
  /** Why this state, in one sentence. */
  detail: string;
  /**
   * Every range this indicator uses, in display order (high to low on the scale).
   * The entry whose key equals currentKey is the range the market is in right now.
   */
  criteria: Criterion[];
  currentKey: string | null;
  /** Extra context line (history, units); may be empty. */
  context: string;
  asOf: string | null;
  available: boolean;
}

export interface Criterion {
  key: string;
  text: string;
}

interface Strings {
  titles: Record<DipId, (index: IndexKey) => string>;
  noData: string;
  noDataDetail: string;
  vix: { calm: string; elevated: string; high: string; extreme: string; detail: Record<string, string> };
  rsi: { strong: string; neutral: string; weak: string; oversold: string; deep: string; hot: string; detail: Record<string, string> };
  ma: {
    up: string;
    testing: string;
    pullback: string;
    bear: string;
    detail: Record<string, string>;
    headline: (name: string, pct: number) => string;
    priceLine: (price: string, avg: string) => string;
    history: string;
  };
  fg: { extremeFear: string; fear: string; neutral: string; greed: string; extremeGreed: string; detail: Record<string, string> };
  vixHeadline: (name: string, value: string) => string;
  vixContext: (pct: number) => string;
  rsiHeadline: (value: string) => string;
  rsiContext: string;
  fgHeadline: (value: string) => string;
  fgContext: string;
}

const indexName = (index: IndexKey, locale: LocaleKey): string =>
  index === "nasdaq" ? (locale === "kr" ? "나스닥" : "NASDAQ") : "S&P 500";

const EN: Strings = {
  titles: {
    vix: (i) => (i === "nasdaq" ? "Panic level (VXN)" : "Panic level (VIX)"),
    rsi: () => "Oversold check (RSI)",
    ma200_deviation: () => "200-day trend",
    fear_greed: () => "Fear & Greed",
  },
  noData: "No data",
  noDataDetail: "This reading is not available right now.",
  vix: {
    calm: "Calm",
    elevated: "Elevated",
    high: "High fear",
    extreme: "Extreme panic",
    detail: {
      calm: "Below 20: investors are relaxed.",
      elevated: "20 to 30: nervous, but not panicking.",
      high: "30 to 40: real fear. Sharp sell-offs often look like this.",
      extreme: "Above 40: panic, seen only in major sell-offs.",
    },
  },
  rsi: {
    strong: "Strong",
    neutral: "Neutral",
    weak: "Getting oversold",
    oversold: "Oversold",
    deep: "Deeply oversold",
    hot: "Overbought",
    detail: {
      hot: "70 or more: has risen fast. Not a dip.",
      strong: "60 to 70: moving up steadily.",
      neutral: "40 to 60: no pressure either way.",
      weak: "30 to 40: heavy selling, close to the oversold line of 30.",
      oversold: "20 to 30: sold hard and fast. The usual oversold zone.",
      deep: "Below 20: very rare, an extreme sell-off.",
    },
  },
  ma: {
    up: "Uptrend",
    testing: "Testing the line",
    pullback: "Pullback",
    bear: "Bear territory",
    detail: {
      up: "More than 2% above its 200-day average.",
      testing: "Within 2% of its 200-day average, a level buyers often watch.",
      pullback: "2% to 10% below its 200-day average: a pullback, not yet a deep decline.",
      bear: "More than 10% below: this is no longer a normal dip.",
    },
    headline: (name, pct) =>
      pct >= 0
        ? `${name} is ${pct.toFixed(1)}% above its 200-day average`
        : `${name} is ${Math.abs(pct).toFixed(1)}% below its 200-day average`,
    priceLine: (price, avg) => `Price ${price} vs 200-day average ${avg}`,
    history: "Over the past 20 years it has been below this line about 1 day in 5.",
  },
  fg: {
    extremeFear: "Extreme fear",
    fear: "Fear",
    neutral: "Neutral",
    greed: "Greed",
    extremeGreed: "Extreme greed",
    detail: {
      extremeFear: "24 or less: investors are very scared.",
      fear: "25 to 44: cautious, selling is stronger than buying.",
      neutral: "45 to 55: balanced.",
      greed: "56 to 75: buyers are confident.",
      extremeGreed: "76 or more: euphoric. Not a dip.",
    },
  },
  vixHeadline: (name, value) => `${name} is at ${value}`,
  vixContext: (pct) => `Higher than ${pct}% of days in the past 20 years.`,
  rsiHeadline: (value) => `RSI is ${value}`,
  rsiContext: "A reading under 30 is usually called oversold.",
  fgHeadline: (value) => `${value} out of 100`,
  fgContext: "0 means extreme fear, 100 means extreme greed.",
};

const KR: Strings = {
  titles: {
    vix: (i) => (i === "nasdaq" ? "공포 수준 (VXN)" : "공포 수준 (VIX)"),
    rsi: () => "과매도 점검 (RSI)",
    ma200_deviation: () => "200일 추세",
    fear_greed: () => "공포·탐욕 지수",
  },
  noData: "데이터 없음",
  noDataDetail: "지금은 이 지표를 확인할 수 없습니다.",
  vix: {
    calm: "안정",
    elevated: "불안",
    high: "높은 공포",
    extreme: "극단적 패닉",
    detail: {
      calm: "20 미만: 투자자들이 느긋한 상태입니다.",
      elevated: "20~30: 불안하지만 패닉은 아닙니다.",
      high: "30~40: 진짜 공포가 있는 구간. 급락장에서 자주 보입니다.",
      extreme: "40 초과: 큰 급락장에서만 나타나는 패닉입니다.",
    },
  },
  rsi: {
    strong: "강세",
    neutral: "중립",
    weak: "과매도에 가까움",
    oversold: "과매도",
    deep: "깊은 과매도",
    hot: "과열",
    detail: {
      hot: "70 이상: 빠르게 올랐습니다. 하락 구간이 아닙니다.",
      strong: "60~70: 꾸준히 오르는 중입니다.",
      neutral: "40~60: 어느 쪽으로도 쏠림이 없습니다.",
      weak: "30~40: 매도가 강하고 과매도선(30)에 가깝습니다.",
      oversold: "20~30: 빠르고 강하게 팔렸습니다. 흔히 말하는 과매도 구간입니다.",
      deep: "20 미만: 매우 드문 극단적 매도입니다.",
    },
  },
  ma: {
    up: "상승 추세",
    testing: "200일선 근처",
    pullback: "조정",
    bear: "약세장 구간",
    detail: {
      up: "200일 평균보다 2% 넘게 위에 있습니다.",
      testing: "200일 평균에서 2% 이내로, 매수자들이 자주 지켜보는 가격대입니다.",
      pullback: "200일 평균보다 2~10% 아래: 조정이며 아직 깊은 하락은 아닙니다.",
      bear: "10% 넘게 아래: 일반적인 눌림목이 아닙니다.",
    },
    headline: (name, pct) =>
      pct >= 0
        ? `${name}은 200일 평균보다 ${pct.toFixed(1)}% 위에 있습니다`
        : `${name}은 200일 평균보다 ${Math.abs(pct).toFixed(1)}% 아래에 있습니다`,
    priceLine: (price, avg) => `현재 ${price} · 200일 평균 ${avg}`,
    history: "최근 20년 동안 이 선 아래에 있던 날은 약 5일 중 1일입니다.",
  },
  fg: {
    extremeFear: "극단적 공포",
    fear: "공포",
    neutral: "중립",
    greed: "탐욕",
    extremeGreed: "극단적 탐욕",
    detail: {
      extremeFear: "24 이하: 투자자들이 매우 겁먹은 상태입니다.",
      fear: "25~44: 조심스럽고 매도가 매수보다 강합니다.",
      neutral: "45~55: 균형 상태입니다.",
      greed: "56~75: 매수자들이 자신감을 보입니다.",
      extremeGreed: "76 이상: 들뜬 상태입니다. 하락 구간이 아닙니다.",
    },
  },
  vixHeadline: (name, value) => `${name} ${value}`,
  vixContext: (pct) => `최근 20년 중 ${pct}%의 날보다 높은 수준입니다.`,
  rsiHeadline: (value) => `RSI ${value}`,
  rsiContext: "30 미만이면 보통 과매도라고 부릅니다.",
  fgHeadline: (value) => `100점 만점에 ${value}점`,
  fgContext: "0은 극단적 공포, 100은 극단적 탐욕입니다.",
};

const STRINGS: Record<LocaleKey, Strings> = { en: EN, kr: KR };

/** Short label for the page header button and guide, kept next to the other copy. */
export const GUIDE_TEXT: Record<LocaleKey, { button: string; title: string; intro: string; levels: string; disclaimer: string; close: string; caveats: string[] }> = {
  en: {
    button: "How to read",
    title: "How to read the dip check",
    intro:
      "Four readings that describe how stressed the market is right now. Each one gets a plain-language state, so you do not need to interpret a score.",
    levels: "The dots show how much a reading looks like a dip: one dot is mild, three is extreme. No dots means it does not look like a dip.",
    disclaimer: "These describe current conditions. They are not a buy or sell signal, and they cannot tell you where the bottom is.",
    close: "Close",
    caveats: [
      "The panic, oversold and fear readings overlap: they usually rise together, so four of them agreeing is not four separate confirmations.",
      "A deep drop below the 200-day average can be the start of a bear market, not just a dip. Many investors buy in stages rather than at one point.",
      "The thresholds (30 for VIX, 30 for RSI, 2% and 10% for the 200-day line) are common round numbers, not guarantees.",
    ],
  },
  kr: {
    button: "읽는 방법",
    title: "하락 구간 점검, 이렇게 읽으세요",
    intro:
      "지금 시장이 얼마나 불안한지 보여주는 네 가지 지표입니다. 점수를 해석할 필요 없이 각 지표를 쉬운 말로 보여줍니다.",
    levels: "점의 개수는 하락 구간처럼 보이는 정도입니다. 점 하나는 약함, 세 개는 극단적입니다. 점이 없으면 하락 구간으로 보이지 않는다는 뜻입니다.",
    disclaimer: "현재 상태를 설명할 뿐 매수·매도 신호가 아니며, 바닥이 어디인지는 알려주지 않습니다.",
    close: "닫기",
    caveats: [
      "공포, 과매도, 공포·탐욕 지표는 서로 겹쳐서 보통 함께 움직입니다. 네 개가 일치해도 서로 다른 네 번의 확인은 아닙니다.",
      "200일 평균 아래로 깊게 내려가면 일반적인 눌림목이 아니라 약세장의 시작일 수 있습니다. 한 번에 사기보다 나눠서 사는 투자자도 많습니다.",
      "기준값(VIX 30, RSI 30, 200일선 2%·10%)은 흔히 쓰는 어림수일 뿐 보장이 아닙니다.",
    ],
  },
};

const num = (value: number, digits: number, locale: LocaleKey): string =>
  value.toLocaleString(locale === "kr" ? "ko-KR" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const VIX_KEYS = ["calm", "elevated", "high", "extreme"] as const;
const RSI_KEYS = ["hot", "strong", "neutral", "weak", "oversold", "deep"] as const;
const MA_KEYS = ["up", "testing", "pullback", "bear"] as const;
const FG_KEYS = ["extremeFear", "fear", "neutral", "greed", "extremeGreed"] as const;

function criteriaFor(id: DipId, s: Strings): Criterion[] {
  const keys =
    id === "vix"
      ? VIX_KEYS
      : id === "rsi"
        ? RSI_KEYS
        : id === "ma200_deviation"
          ? MA_KEYS
          : FG_KEYS;
  const detail =
    id === "vix"
      ? s.vix.detail
      : id === "rsi"
        ? s.rsi.detail
        : id === "ma200_deviation"
          ? s.ma.detail
          : s.fg.detail;
  return keys.map((key) => ({ key, text: detail[key] }));
}

function unavailable(id: DipId, index: IndexKey, s: Strings): Gauge {
  return {
    id,
    title: s.titles[id](index),
    headline: s.noData,
    state: s.noData,
    level: 0,
    detail: s.noDataDetail,
    criteria: [],
    currentKey: null,
    context: "",
    asOf: null,
    available: false,
  };
}

export function vixState(value: number): { key: "calm" | "elevated" | "high" | "extreme"; level: DipLevel } {
  if (value >= 40) return { key: "extreme", level: 3 };
  if (value >= 30) return { key: "high", level: 2 };
  if (value >= 20) return { key: "elevated", level: 1 };
  return { key: "calm", level: 0 };
}

export function rsiState(value: number): { key: "hot" | "strong" | "neutral" | "weak" | "oversold" | "deep"; level: DipLevel } {
  if (value < 20) return { key: "deep", level: 3 };
  if (value < 30) return { key: "oversold", level: 2 };
  if (value < 40) return { key: "weak", level: 1 };
  if (value < 60) return { key: "neutral", level: 0 };
  if (value < 70) return { key: "strong", level: 0 };
  return { key: "hot", level: 0 };
}

export function trendState(pct: number): { key: "up" | "testing" | "pullback" | "bear"; level: DipLevel } {
  if (pct < -10) return { key: "bear", level: 3 };
  if (pct < -2) return { key: "pullback", level: 2 };
  if (pct <= 2) return { key: "testing", level: 1 };
  return { key: "up", level: 0 };
}

export function fearGreedState(
  value: number,
): { key: "extremeFear" | "fear" | "neutral" | "greed" | "extremeGreed"; level: DipLevel } {
  if (value <= 24) return { key: "extremeFear", level: 3 };
  if (value <= 44) return { key: "fear", level: 1 };
  if (value <= 55) return { key: "neutral", level: 0 };
  if (value <= 75) return { key: "greed", level: 0 };
  return { key: "extremeGreed", level: 0 };
}

export function buildGauges(
  indicators: Indicator[],
  trend: TrendSummary | null,
  index: IndexKey,
  locale: LocaleKey,
): Gauge[] {
  const s = STRINGS[locale];
  const byId = new Map(indicators.map((indicator) => [indicator.id, indicator]));
  const name = indexName(index, locale);

  return DIP_IDS.map((id): Gauge => {
    const indicator = byId.get(id);
    const value = indicator?.latest?.value;
    if (!indicator || value === null || value === undefined || !Number.isFinite(value)) {
      return unavailable(id, index, s);
    }
    const base = { id, title: s.titles[id](index), asOf: indicator.latest?.date ?? null, available: true };

    if (id === "vix") {
      const { key, level } = vixState(value);
      const pct = indicator.score?.percentile;
      return {
        ...base,
        headline: s.vixHeadline(indicator.short_name || "VIX", num(value, 1, locale)),
        state: s.vix[key],
        level,
        detail: s.vix.detail[key],
        criteria: criteriaFor(id, s),
        currentKey: key,
        context: pct !== null && pct !== undefined ? s.vixContext(Math.round(pct)) : "",
      };
    }
    if (id === "rsi") {
      const { key, level } = rsiState(value);
      return {
        ...base,
        headline: s.rsiHeadline(num(value, 1, locale)),
        state: s.rsi[key],
        level,
        detail: s.rsi.detail[key],
        criteria: criteriaFor(id, s),
        currentKey: key,
        context: s.rsiContext,
      };
    }
    if (id === "ma200_deviation") {
      const { key, level } = trendState(value);
      const price = trend?.price;
      const avg = trend?.ma200;
      const priceLine =
        price !== null && price !== undefined && avg !== null && avg !== undefined
          ? `${s.ma.priceLine(num(price, 0, locale), num(avg, 0, locale))}. `
          : "";
      return {
        ...base,
        headline: s.ma.headline(name, value),
        state: s.ma[key],
        level,
        detail: s.ma.detail[key],
        criteria: criteriaFor(id, s),
        currentKey: key,
        context: `${priceLine}${s.ma.history}`,
      };
    }
    const { key, level } = fearGreedState(value);
    return {
      ...base,
      headline: s.fgHeadline(num(value, 0, locale)),
      state: s.fg[key],
      level,
      detail: s.fg.detail[key],
      criteria: criteriaFor(id, s),
      currentKey: key,
      context: s.fgContext,
    };
  });
}
