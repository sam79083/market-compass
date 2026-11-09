import { useEffect, useState } from "react";
import { fetchSectors } from "../api";
import type { LocaleKey } from "../i18n";
import type { SectorEntry, SectorsPayload } from "../types";
import { formatDate, formatNumber } from "../utils";

interface SectorCheckProps {
  locale: LocaleKey;
}

const TEXT: Record<
  LocaleKey,
  {
    eyebrow: string;
    title: string;
    sub: string;
    asOf: string;
    rsi_label: string;
    noData: string;
    under: string;
    right: string;
    over: string;
    note: string;
    axis_under: string;
    axis_over: string;
    dev_above_p: string;
    dev_below_p: string;
    dev_flat: string;
    unavailable: string;
    stale_label: string;
    hints: Record<HintKey, string>;
  }
> = {
  en: {
    eyebrow: "Sector check",
    title: "The sectors, in one glance",
    sub: (
      "Twenty ETFs: the eleven sectors, defense, and a few subsector, theme and macro reads (semiconductors, software, cybersecurity, biotech, nuclear, clean energy, Treasuries, gold). " +
      "Cheap or hot is judged from RSI(14), a 2-3 week measure. The 200-day distance shows the trend. " +
      "This section always shows these sectors, whichever index view you choose."
    ),
    asOf: "As of",
    rsi_label: "RSI(14)",
    noData: "No data",
    under: "Undervalued",
    right: "Fairly valued",
    over: "Overvalued",
    note: "Tags follow RSI(14): under 30 undervalued, over 70 overvalued, between fairly valued — a 2-3 week momentum read, not earnings-based valuation. The 200-day gap is a separate medium-term trend signal and can disagree; the caption on each card reconciles the two. Tags are a point-in-time snapshot and can change daily.",
    axis_under: "Undervalued",
    axis_over: "Overvalued",
    dev_above_p: "above 200-day",
    dev_below_p: "below 200-day",
    dev_flat: "in line with 200-day",
    unavailable: "No series in feed",
    stale_label: "Stale data",
    hints: {
      under_uptrend: "A dip inside an uptrend — watchlist candidate",
      under_downtrend: "Oversold inside a downtrend — bounce signal, trend weak",
      under_plain: "Oversold zone (short-term)",
      right_uptrend: "Trend intact, not overheated short-term",
      right_downtrend: "Quiet short-term, but the trend is weak",
      right_plain: "Neutral short-term momentum",
      over_uptrend: "Overheated after a strong run — pullback risk",
      over_downtrend: "Overheated bounce in a weak trend",
      over_plain: "Overbought zone (short-term)",
    },
  },
  kr: {
    eyebrow: "부문 점검",
    title: "부문 ETF, 오늘은 어느 쪽인가요?",
    sub: (
      "11개 섹터와 방산(ITA)에, 반도체·소프트웨어·사이버보안·바이오·원전·클린에너지 같은 세부 업종과 국채·금까지 총 20개 ETF입니다. " +
      "저평가·과열 판단은 2~3주 흐름을 재는 RSI(14)로 하고, 200일 평균과의 거리는 추세 방향을 보여줍니다. " +
      "S&P 500을 고르든 나스닥을 고르든 이 부문은 항상 아래에 표시됩니다."
    ),
    asOf: "기준",
    rsi_label: "RSI(14)",
    noData: "데이터 없음",
    under: "저평가",
    right: "적정",
    over: "과열",
    note: "태그는 RSI(14) 기준 — 30 미만 저평가 · 70 초과 과열 · 그 사이 적정. 최근 2~3주 매매 강도를 보는 단기 관점이라 실적 기반 밸류에이션과 다릅니다. 200일선 대비는 중기 추세 신호라 방향이 어긋날 수 있습니다 — 각 카드 속 문구가 두 신호를 함께 읽어줍니다. 태그는 오늘의 스냅샷으로 매일 바뀔 수 있습니다.",
    axis_under: "저평가",
    axis_over: "과열",
    dev_above_p: "200일선 위",
    dev_below_p: "200일선 아래",
    dev_flat: "200일선과 동일",
    unavailable: "시계열 미수집",
    stale_label: "지난 데이터",
    hints: {
      under_uptrend: "상승 추세 속 단기 눌림 — 관심 후보",
      under_downtrend: "약세 속 과매도 — 반등 신호, 추세는 주의",
      under_plain: "단기 과매도 구간",
      right_uptrend: "추세는 유지, 단기 과열 아님",
      right_downtrend: "단기는 평온, 추세는 약세",
      right_plain: "단기 흐름은 평온",
      over_uptrend: "강한 상승 후 과열 — 조정 가능성",
      over_downtrend: "약세 속 반등 과열 — 추세 주의",
      over_plain: "단기 과매수 구간",
    },
  },
};

const KR_NAME: Record<string, string> = {
  XLE: "에너지",
  XLB: "소재",
  XLI: "산업재",
  ITA: "항공우주·방위",
  XLF: "금융",
  XLK: "기술",
  XLC: "커뮤니케이션 서비스",
  XLY: "경기 소비재",
  XLP: "필수 소비재",
  XLV: "헬스케어",
  XLRE: "리츠·부동산",
  XLU: "유틸리티",
  SOXX: "반도체",
  IGV: "소프트웨어",
  CIBR: "사이버보안",
  XBI: "바이오테크",
  URA: "원전·우라늄",
  ICLN: "클린에너지",
  TLT: "미국 장기국채",
  GLD: "금",
};

type TagKey = "under" | "right" | "over";

type HintKey =
  | "under_uptrend"
  | "under_downtrend"
  | "under_plain"
  | "right_uptrend"
  | "right_downtrend"
  | "right_plain"
  | "over_uptrend"
  | "over_downtrend"
  | "over_plain";

const HINT_SIDES: Record<TagKey, [HintKey, HintKey, HintKey]> = {
  under: ["under_uptrend", "under_downtrend", "under_plain"],
  right: ["right_uptrend", "right_downtrend", "right_plain"],
  over: ["over_uptrend", "over_downtrend", "over_plain"],
};

function hintKeyFor(tag: TagKey, hasDev: boolean, devUp: boolean): HintKey {
  const [up, down, plain] = HINT_SIDES[tag];
  if (!hasDev) return plain;
  return devUp ? up : down;
}

function tagFromRsi(rsi: number): TagKey {
  if (rsi < 30) return "under";
  if (rsi > 70) return "over";
  return "right";
}

function SectorCard({ entry, locale, referenceAsOf }: { entry: SectorEntry; locale: LocaleKey; referenceAsOf: string | null }) {
  const copy = TEXT[locale];
  const rsi = entry.rsi;
  const dev = entry.dev;
  const rsiVal: number | null = typeof rsi === "number" && Number.isFinite(rsi) ? rsi : null;
  const devVal: number | null = typeof dev === "number" && Number.isFinite(dev) ? dev : null;
  const isFlat = devVal !== null && Math.abs(devVal) < 0.05;
  const devUp = (devVal ?? 0) >= 0;
  const tag: TagKey | null = rsiVal !== null ? tagFromRsi(rsiVal) : null;
  const tagText = tag ? copy[tag] : copy.noData;
  const hint = rsiVal !== null && tag ? copy.hints[hintKeyFor(tag, devVal !== null, devUp)] : null;
  const unavailable = entry.available === false;
  const stale = !unavailable && entry.as_of != null && referenceAsOf != null && entry.as_of !== referenceAsOf;
  const bar = rsiVal !== null ? Math.min(100, Math.max(0, rsiVal)) : null;
  const barAria = rsiVal !== null ? (hint ? `${copy.rsi_label} ${formatNumber(rsiVal, 1)}. ${hint}` : `${copy.rsi_label} ${formatNumber(rsiVal, 1)}`) : copy.noData;

  return (
    <div className={`sector-card${unavailable ? " is-unavailable" : ""}`}>
      <div className="sector-card-head">
        <span className="sector-symbol">{entry.symbol}</span>
        <span className="sector-name">{locale === "kr" ? KR_NAME[entry.symbol] ?? entry.name : entry.name}</span>
      </div>
      {unavailable ? (
        <p className="sector-availability is-missing">{copy.unavailable}</p>
      ) : (
        stale &&
        entry.as_of && (
          <p className="sector-availability is-stale">
            {copy.stale_label} · {formatDate(entry.as_of, locale)}
          </p>
        )
      )}
      <span className={`sector-tag sector-tag-${tag ?? "none"}`}>{tagText}</span>
      {hint && <p className="sector-hint">{hint}</p>}
      {rsiVal !== null && bar !== null ? (
        <>
          <div className="sector-rsi-num">
            <span className="sector-rsi-label">{copy.rsi_label}</span>
            <span className="sector-rsi-value">{formatNumber(rsiVal, 1)}</span>
          </div>
          <div className="sector-bar" role="img" aria-label={barAria}>
            <span className="sector-bar-zone is-zone-under" />
            <span className="sector-bar-zone is-zone-mid" />
            <span className="sector-bar-zone is-zone-over" />
            <span className="sector-bar-marker" style={{ left: `clamp(5.5px, ${bar}%, calc(100% - 5.5px))` }} />
          </div>
          <div className="sector-bar-axis" aria-hidden="true">
            <span className="is-axis-under">← {copy.axis_under}</span>
            <span className="is-axis-over">{copy.axis_over} →</span>
          </div>
        </>
      ) : (
        <div className="sector-rsi-value sector-rsi-missing">—</div>
      )}
      {devVal !== null &&
        (isFlat ? (
          <div className="sector-dev is-flat">≈ 0.0% {copy.dev_flat}</div>
        ) : (
          <div className={`sector-dev ${devUp ? "is-up" : "is-down"}`}>
            {devUp ? "▲" : "▼"} {(devUp ? "+" : "") + formatNumber(devVal, 1)}% {devUp ? copy.dev_above_p : copy.dev_below_p}
          </div>
        ))}
    </div>
  );
}

export function SectorCheck({ locale }: SectorCheckProps) {
  const [payload, setPayload] = useState<SectorsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const copy = TEXT[locale];

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchSectors(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setPayload(data);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Could not load sectors");
        setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const sectors = payload?.sectors ?? [];

  return (
    <section className="panel sector-panel" id="sector-check">
      <div className="panel-head">
        <div>
          <div className="eyebrow">{copy.eyebrow}</div>
          <h1>{copy.title}</h1>
          <p className="panel-sub">{copy.sub}</p>
        </div>
        {payload?.as_of && (
          <div className="as-of">
            {copy.asOf} {formatDate(payload.as_of, locale)}
          </div>
        )}
      </div>
      {loading ? (
        <div className="sector-grid">
          {Array.from({ length: 20 },(_item, index) => (
            <div key={index} className="sector-skeleton" />
          ))}
        </div>
      ) : error ? (
        <p className="sector-error">{error}</p>
      ) : (
        <>
          <div className="sector-grid">
            {sectors.map((entry) => (
              <SectorCard key={entry.symbol} entry={entry} locale={locale} referenceAsOf={payload?.as_of ?? null} />
            ))}
          </div>
          <p className="sector-note">{copy.note}</p>
        </>
      )}
    </section>
  );
}
