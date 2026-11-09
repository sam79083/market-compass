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
    criteria: string;
  }
> = {
  en: {
    eyebrow: "Sector check",
    title: "The sectors, in one glance",
    sub: (
      "Twelve ETFs, each covering a different slice of the market (plus defense). " +
      "Cheap or hot is judged from RSI(14), a 2-3 week measure. The 200-day distance shows the trend. " +
      "This section always shows these sectors, whichever index view you choose."
    ),
    asOf: "As of",
    rsi_label: "RSI(14)",
    noData: "No data",
    under: "Undervalued",
    right: "Fairly valued",
    over: "Overvalued",
    note: "RSI under 30 reads oversold: heavy short-term selling, a pullback zone. Above 70 reads overbought: short-term buying is exuberant. This is a momentum gauge, not a long-term valuation measure.",
    criteria: "Tag rule: RSI(14) under 30 = undervalued, over 70 = overvalued, in between = fairly valued. Momentum view only; it differs from earnings-based valuation.",
  },
  kr: {
    eyebrow: "부문 점검",
    title: "부문 ETF, 오늘은 어느 쪽인가요?",
    sub: (
      "시장을 서로 겹치지 않게 조각 내는 ETF 12개입니다(방산은 ITA 하나만). " +
      "저평가·과열 판단은 2~3주 흐름을 재는 RSI(14)로 하고, 200일 평균과의 거리는 추세 방향을 보여줍니다. " +
      "S&P 500을 고르든 나스닥을 고르든 이 부문은 항상 아래에 표시됩니다."
    ),
    asOf: "기준",
    rsi_label: "RSI(14)",
    noData: "데이터 없음",
    under: "저평가",
    right: "적정",
    over: "과열",
    note: "RSI 30 미만이면 과매도에 가까운 단기 저평가, 70 초과면 과매수에 가까운 단기 과열로 봅니다. 200일선 위는 상승 추세, 아래는 하락 추세입니다.",
    criteria: "표시 기준 — RSI(14): 30 미만 저평가 · 70 초과 과열 · 그 사이 적정. 이는 단기(2~3주) 모멘텀 판단이며, 실적 기반의 장기 밸류에이션과 다를 수 있습니다.",
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
};

type TagKey = "under" | "right" | "over";

function tagFromRsi(rsi: number): TagKey {
  if (rsi < 30) return "under";
  if (rsi > 70) return "over";
  return "right";
}

function SectorCard({ entry, locale }: { entry: SectorEntry; locale: LocaleKey }) {
  const copy = TEXT[locale];
  const rsi = entry.rsi;
  const dev = entry.dev;
  const hasDev = dev !== null && dev !== undefined && Number.isFinite(dev);
  const devUp = hasDev && (dev as number) >= 0;
  const tag: TagKey | null = rsi !== null && Number.isFinite(rsi) ? tagFromRsi(rsi) : null;
  const tagText = tag ? copy[tag] : copy.noData;

  return (
    <div className="sector-card">
      <div className="sector-card-head">
        <span className="sector-symbol">{entry.symbol}</span>
        <span className="sector-name">{locale === "kr" ? KR_NAME[entry.symbol] ?? entry.name : entry.name}</span>
      </div>
      <span className={`sector-tag sector-tag-${tag ?? "none"}`}>{tagText}</span>
      {rsi !== null && Number.isFinite(rsi) ? (
        <>
          <div className="sector-rsi-num">
            <span className="sector-rsi-label">{copy.rsi_label}</span>
            <span className="sector-rsi-value">{formatNumber(rsi, 1)}</span>
          </div>
          <div className="sector-bar" role="img" aria-label={`${copy.rsi_label} ${formatNumber(rsi, 1)}`}>
            <span className="sector-bar-zone is-zone-under" />
            <span className="sector-bar-zone is-zone-mid" />
            <span className="sector-bar-zone is-zone-over" />
            <span className="sector-bar-marker" style={{ left: `${Math.min(100, Math.max(0, rsi))}%` }} />
          </div>
        </>
      ) : (
        <div className="sector-rsi-value sector-rsi-missing">—</div>
      )}
      {hasDev && (
        <div className={`sector-dev ${devUp ? "is-up" : "is-down"}`}>
          {(devUp ? "+" : "") + formatNumber(dev, 1)}
          {locale === "kr" ? "% 200일선 대비" : "% vs 200-day"}
        </div>
      )}
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
          {Array.from({ length: 12 }, (_item, index) => (
            <div key={index} className="sector-skeleton" />
          ))}
        </div>
      ) : error ? (
        <p className="sector-error">{error}</p>
      ) : (
        <>
          <div className="sector-grid">
            {sectors.map((entry) => (
              <SectorCard key={entry.symbol} entry={entry} locale={locale} />
            ))}
          </div>
          <p className="sector-note">{copy.criteria}</p>
          <p className="sector-note">{copy.note}</p>
        </>
      )}
    </section>
  );
}
