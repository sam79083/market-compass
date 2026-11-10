import { useEffect, useState } from "react";
import { fetchSectors } from "../api";
import type { LocaleKey } from "../i18n";
import type { SectorEntry, SectorsPayload, ThemeMode } from "../types";
import { formatDate, formatNumber } from "../utils";
import { SectorModal } from "./SectorModal";

interface SectorCheckProps {
  locale: LocaleKey;
  theme: ThemeMode;
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
    extreme_under: string;
    extreme_over: string;
    note: string;
    axis_under: string;
    axis_over: string;
    dev_label: string;
    momentum_low: string;
    momentum_plain: string;
    momentum_high: string;
    rsi_scale: string;
    unavailable: string;
    stale_label: string;
    price_label: string;
    ma200_label: string;
    group_empty: string;
    group_nodata: string;
    view_chart: string;
    hints: Record<HintKey, string>;
  }
> = {
  en: {
    eyebrow: "Sector check",
    title: "The sectors, in one glance",
    sub: (
      "Twenty ETFs: the eleven sectors, defense, and a few subsector, theme and macro reads (semiconductors, software, cybersecurity, biotech, nuclear, clean energy, Treasuries, gold). " +
      "Cheap or hot is judged from the 200-day distance (±5%, ±15% or more marked extreme). RSI(14) is a short-term momentum guide only. " +
      "This section always shows these sectors, whichever index view you choose."
    ),
    asOf: "As of",
    rsi_label: "RSI(14)",
    noData: "No data",
    under: "Undervalued",
    right: "Fairly valued",
    over: "Overvalued",
    extreme_under: "Extremely undervalued",
    extreme_over: "Extremely overvalued",
    note: "Tags follow the 200-day distance: below -5% undervalued, above +5% overvalued, between fairly valued — a medium-term trend read, not earnings-based valuation. Beyond ±15% it is flagged as extreme. RSI(14) is a 2-3 week momentum read shown for reference and does not affect the tag; it can disagree with it. The caption on each card reconciles the two. Tags are a point-in-time snapshot and can change daily.",
    axis_under: "Undervalued",
    axis_over: "Overvalued",
    dev_label: "vs 200-day",
    momentum_low: "oversold",
    momentum_plain: "neutral",
    momentum_high: "overbought",
    rsi_scale: "below 30 oversold · above 70 overbought",
    unavailable: "No series in feed",
    stale_label: "Stale data",
    price_label: "Price",
    ma200_label: "200-day",
    group_empty: "None right now",
    group_nodata: "No data",
    view_chart: "View chart ›",
    hints: {
      under_low: "Below the 200-day, short-term oversold — rebound potential",
      under_plain: "Below the 200-day, neutral short-term",
      under_high: "Below the 200-day, but short-term momentum is strong",
      right_low: "Near the 200-day, short-term oversold",
      right_plain: "Near the 200-day, neutral short-term",
      right_high: "Near the 200-day, short-term overheated",
      over_low: "Above the 200-day, short-term pulling back",
      over_plain: "Above the 200-day, neutral short-term",
      over_high: "Above the 200-day, short-term overheated — pullback risk",
    },
  },
  kr: {
    eyebrow: "부문 점검",
    title: "부문 ETF, 오늘은 어느 쪽인가요?",
    sub: (
      "11개 섹터와 방산(ITA)에, 반도체·소프트웨어·사이버보안·바이오·원전·클린에너지 같은 세부 업종과 국채·금까지 총 20개 ETF입니다. " +
      "저평가·과열 판단은 200일 평균과의 거리(±5%, ±15% 이상은 극단 표시)로 하고, RSI(14)는 단기 모멘텀 참고 지표입니다. " +
      "S&P 500을 고르든 나스닥을 고르든 이 부문은 항상 아래에 표시됩니다."
    ),
    asOf: "기준",
    rsi_label: "RSI(14)",
    noData: "데이터 없음",
    under: "저평가",
    right: "적정",
    over: "과열",
    extreme_under: "극단적 저평가",
    extreme_over: "극단적 과열",
    note: "태그는 200일선 대비 기준 — -5% 아래 저평가 · +5% 위 과열 · 그 사이 적정. 중기 추세의 시각이라 실적 기반 밸류에이션과는 다릅니다. ±15%를 넘으면 극단으로 표시합니다. RSI(14)는 최근 2~3주 매매 강도를 보는 참고 지표로, 태그에는 반영되지 않으며 방향이 어긋날 수도 있습니다. 각 카드 속 문구가 두 신호를 함께 읽어줍니다. 태그는 오늘의 스냅샷으로 매일 바뀔 수 있습니다.",
    axis_under: "저평가",
    axis_over: "과열",
    dev_label: "200일선 대비",
    momentum_low: "과매도",
    momentum_plain: "중립",
    momentum_high: "과매수",
    rsi_scale: "30 아래 과매도 · 70 위 과매수",
    unavailable: "시계열 미수집",
    stale_label: "지난 데이터",
    price_label: "현재가",
    ma200_label: "200일선",
    group_empty: "현재 해당 없음",
    group_nodata: "데이터 없음",
    view_chart: "차트 보기 ›",
    hints: {
      under_low: "200일선 아래 · 단기 과매도 — 반등 탄력 가능성",
      under_plain: "200일선 아래 · 단기는 중립",
      under_high: "200일선 아래지만 단기 수급은 강함",
      right_low: "200일선 부근 · 단기 과매도",
      right_plain: "200일선 부근 · 단기는 중립",
      right_high: "200일선 부근 · 단기 과열",
      over_low: "200일선 위 · 단기 조정 중",
      over_plain: "200일선 위 · 단기는 중립",
      over_high: "200일선 위 · 단기 과열 — 조정 가능성",
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
  | "under_low"
  | "under_plain"
  | "under_high"
  | "right_low"
  | "right_plain"
  | "right_high"
  | "over_low"
  | "over_plain"
  | "over_high";

type RsiMood = "low" | "plain" | "high";

const HINT_SIDES: Record<TagKey, [HintKey, HintKey, HintKey]> = {
  under: ["under_low", "under_high", "under_plain"],
  right: ["right_low", "right_high", "right_plain"],
  over: ["over_low", "over_high", "over_plain"],
};

function hintKeyFor(tag: TagKey, mood: RsiMood): HintKey {
  const [low, high, plain] = HINT_SIDES[tag];
  if (mood === "low") return low;
  if (mood === "high") return high;
  return plain;
}

function rsiMood(rsi: number | null): RsiMood {
  if (rsi === null) return "plain";
  if (rsi < 30) return "low";
  if (rsi > 70) return "high";
  return "plain";
}

function tagFromDev(dev: number): TagKey {
  if (dev < -5) return "under";
  if (dev > 5) return "over";
  return "right";
}

const DEV_DOMAIN = 20;

function devPosition(dev: number): number {
  const clamped = Math.min(DEV_DOMAIN, Math.max(-DEV_DOMAIN, dev));
  return ((clamped + DEV_DOMAIN) / (2 * DEV_DOMAIN)) * 100;
}

function SectorCard({
  entry,
  locale,
  referenceAsOf,
  onSelect,
}: {
  entry: SectorEntry;
  locale: LocaleKey;
  referenceAsOf: string | null;
  onSelect: (entry: SectorEntry) => void;
}) {
  const copy = TEXT[locale];
  const rsi = entry.rsi;
  const dev = entry.dev;
  const rsiVal: number | null = typeof rsi === "number" && Number.isFinite(rsi) ? rsi : null;
  const devVal: number | null = typeof dev === "number" && Number.isFinite(dev) ? dev : null;
  const priceVal: number | null = typeof entry.price === "number" && Number.isFinite(entry.price) ? entry.price : null;
  const ma200Val: number | null = typeof entry.ma200 === "number" && Number.isFinite(entry.ma200) ? entry.ma200 : null;
  const isFlat = devVal !== null && Math.abs(devVal) < 0.05;
  const devUp = (devVal ?? 0) >= 0;
  const tag: TagKey | null = devVal !== null ? tagFromDev(devVal) : null;
  const extreme = devVal !== null && Math.abs(devVal) >= 15;
  const tagText = tag
    ? copy[extreme ? (tag === "over" ? "extreme_over" : "extreme_under") : tag]
    : copy.noData;
  const tagClass = tag ? (extreme ? `sector-tag-extreme-${tag}` : `sector-tag-${tag}`) : "sector-tag-none";
  const hint = tag ? copy.hints[hintKeyFor(tag, rsiMood(rsiVal))] : null;
  const unavailable = entry.available === false;
  const stale = !unavailable && entry.as_of != null && referenceAsOf != null && entry.as_of !== referenceAsOf;
  const bar = devVal !== null ? devPosition(devVal) : null;
  const devValue = isFlat || devVal === null
    ? "≈ 0.0%"
    : `${devUp ? "▲" : "▼"} ${(devUp ? "+" : "") + formatNumber(devVal, 1)}%`;
  const devAria = devVal !== null ? `${copy.dev_label} ${(devUp ? "+" : "") + formatNumber(devVal, 1)}%` : copy.noData;
  const mood = rsiMood(rsiVal);
  const moodWord = mood === "low" ? copy.momentum_low : mood === "high" ? copy.momentum_high : copy.momentum_plain;

  return (
    <div
      className={`sector-card${unavailable ? " is-unavailable" : " is-clickable"}`}
      role={unavailable ? undefined : "button"}
      tabIndex={unavailable ? undefined : 0}
      aria-label={unavailable ? undefined : `${entry.symbol} ${copy.view_chart}`}
      onClick={unavailable ? undefined : () => onSelect(entry)}
      onKeyDown={
        unavailable
          ? undefined
          : (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(entry);
              }
            }
      }
    >
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
      <span className={`sector-tag ${tagClass}`}>{tagText}</span>
      {hint && <p className="sector-hint">{hint}</p>}
      {devVal !== null && bar !== null ? (
        <>
          <div className="sector-rsi-num">
            <span className="sector-rsi-label">{copy.dev_label}</span>
            <span className={`sector-dev-value ${isFlat ? "is-flat" : devUp ? "is-up" : "is-down"}`}>{devValue}</span>
          </div>
          <div className="sector-bar sector-dev-bar" role="img" aria-label={devAria}>
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
      {priceVal !== null && (
        <div className="sector-price">
          <span>
            {copy.price_label} <strong>${formatNumber(priceVal, 2)}</strong>
          </span>
          {ma200Val !== null && (
            <span>
              {copy.ma200_label} ${formatNumber(ma200Val, 2)}
            </span>
          )}
        </div>
      )}
      {rsiVal !== null && (
        <p className="sector-rsi-ref">
          <span className="sector-rsi-ref-left">
            <span className="sector-rsi-ref-label">{copy.rsi_label}</span>
            <span className="sector-rsi-ref-value">{formatNumber(rsiVal, 1)}</span>
            <span className={`sector-rsi-ref-pill is-${mood}`}>{moodWord}</span>
          </span>
          <span className="sector-rsi-ref-scale">{copy.rsi_scale}</span>
        </p>
      )}
      {!unavailable && <span className="sector-view-chart">{copy.view_chart}</span>}
    </div>
  );
}

export function SectorCheck({ locale, theme }: SectorCheckProps) {
  const [selected, setSelected] = useState<SectorEntry | null>(null);
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

  // Three buckets by the 200-day deviation tag, sorted ascending by dev (most undervalued first).
  // ETFs without a usable deviation reading go to a fourth bucket that only renders if needed.
  const buckets: Record<TagKey | "nodata", SectorEntry[]> = { under: [], right: [], over: [], nodata: [] };
  for (const entry of sectors) {
    const value = entry.dev;
    if (typeof value === "number" && Number.isFinite(value)) buckets[tagFromDev(value)].push(entry);
    else buckets.nodata.push(entry);
  }
  const devOf = (entry: SectorEntry) => entry.dev ?? 0;
  buckets.under.sort((a, b) => devOf(a) - devOf(b));
  buckets.right.sort((a, b) => devOf(a) - devOf(b));
  buckets.over.sort((a, b) => devOf(a) - devOf(b));
  const groupOrder: Array<TagKey | "nodata"> = ["under", "right", "over", "nodata"];

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
          {groupOrder.map((key) => {
            const items = buckets[key];
            if (key === "nodata" && items.length === 0) return null;
            const title = key === "nodata" ? copy.group_nodata : copy[key];
            return (
              <div key={key} className={`sector-group is-${key}`}>
                <h2 className="sector-group-title">
                  <span className="sector-group-dot" aria-hidden="true" />
                  {title}
                  <span className="sector-group-count">{items.length}</span>
                </h2>
                {items.length === 0 ? (
                  <p className="sector-group-empty">{copy.group_empty}</p>
                ) : (
                  <div className="sector-grid">
                    {items.map((entry) => (
                      <SectorCard
                        key={entry.symbol}
                        entry={entry}
                        locale={locale}
                        referenceAsOf={payload?.as_of ?? null}
                        onSelect={setSelected}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <p className="sector-note">{copy.note}</p>
          {selected && (
            <SectorModal
              symbol={selected.symbol}
              displayName={locale === "kr" ? KR_NAME[selected.symbol] ?? selected.name : selected.name}
              theme={theme}
              locale={locale}
              onClose={() => setSelected(null)}
            />
          )}
        </>
      )}
    </section>
  );
}
