import { useEffect, useMemo, useState } from "react";
import { sectorChartOption } from "../charts";
import { useEtfHoldings, useFocusTrap, useMediaQuery, useSectorHistory } from "../hooks";
import { LOCALE_TEXT } from "../i18n";
import type { LocaleKey } from "../i18n";
import type { EtfHoldingsPayload, SectorPoint, ThemeMode } from "../types";
import { formatDate, formatNumber } from "../utils";
import { Chart } from "./Chart";

interface SectorModalProps {
  symbol: string;
  displayName: string;
  theme: ThemeMode;
  locale: LocaleKey;
  onClose: () => void;
}

const RANGES: Array<{ key: string; label: string; days: number | null }> = [
  { key: "3m", label: "3M", days: 63 },
  { key: "6m", label: "6M", days: 126 },
  { key: "1y", label: "1Y", days: 252 },
  { key: "2y", label: "2Y", days: null },
];

const TEXT: Record<
  LocaleKey,
  {
    eyebrow: string;
    price: string;
    ma200: string;
    rsi: string;
    asOf: string;
    note: string;
    rangeAria: string;
    chartAria: string;
    noData: string;
    loadError: string;
    holdingsTitle: string;
    holdingsCount: (count: number) => string;
    holdingsTotal: (total: number) => string;
    holdingsSource: string;
    holdingsLoading: string;
    holdingsError: string;
    holdingsNone: string;
    noHoldingsFor: Record<string, string>;
    helpTitle: string;
    maTitle: string;
    maBody: string;
    rsiTitle: string;
    rsiBody: string;
    readingTitle: string;
    devAbove: (dev: number) => string;
    devBelow: (dev: number) => string;
    rsiOverbought: string;
    rsiOversold: string;
    rsiNeutral: string;
    readingVerdict: string;
    helpMore: string;
  }
> = {
  en: {
    eyebrow: "Sector chart",
    price: "Price",
    ma200: "200-day",
    rsi: "RSI(14)",
    asOf: "As of",
    note: "Daily closes in USD, price return (dividends not included).",
    rangeAria: "Chart range",
    chartAria: "price and RSI chart",
    noData: "No history available for this ETF yet.",
    loadError: "Could not load history.",
    holdingsTitle: "Portfolio",
    holdingsCount: (count) => `Top ${count} holdings · % of net assets`,
    holdingsTotal: (total) => `Top ${formatNumber(total, 1)}% combined`,
    holdingsSource: "Yahoo Finance (unofficial). Weights can drift between rebalances.",
    holdingsLoading: "Loading holdings…",
    holdingsError: "Could not load holdings.",
    holdingsNone: "No holdings reported in the feed for this ETF.",
    noHoldingsFor: {
      GLD: "Holds physical gold bullion — no stock portfolio to list.",
      TLT: "Holds long-term U.S. Treasury bonds — no stock portfolio to list.",
    },
    helpTitle: "How to read this chart",
    maTitle: "Top panel · price & the 200-day line",
    maBody:
      "The 200-day line is the average close over the last 200 trading days. Price above it = stronger long-term trend; below it = weaker. It smooths out the noise — treat it as “which side of the trend are we on”, not as a buy/sell switch.",
    rsiTitle: "Bottom panel · RSI(14)",
    rsiBody:
      "RSI measures up/down momentum over the last 14 days on a 0–100 scale. Below 30 = oversold (sell-off may be overdone) · above 70 = overbought (due for a breather) · 30–70 = neutral. In a weak downtrend it can sit below 30 for weeks — never act on it alone.",
    readingTitle: "Read right now",
    devAbove: (dev) => `Price is ${formatNumber(dev, 1)}% above its 200-day line`,
    devBelow: (dev) => `Price is ${formatNumber(Math.abs(dev), 1)}% below its 200-day line`,
    rsiOverbought: "overbought",
    rsiOversold: "oversold",
    rsiNeutral: "neutral",
    readingVerdict:
      "This chart only shows trend and short-term heat — it cannot tell you the right entry. Weigh valuation and your overall portfolio too, and don't invest on this chart alone. Not investment advice.",
    helpMore: "See definitions and the full backtest on the methodology page",
  },
  kr: {
    eyebrow: "부문 차트",
    price: "현재가",
    ma200: "200일선",
    rsi: "RSI(14)",
    asOf: "기준",
    note: "미국 시장 종가 기준 (USD), 배당금 미반영 가격수익률입니다.",
    rangeAria: "차트 기간",
    chartAria: "가격 및 RSI 차트",
    noData: "이 ETF의 과거 데이터가 아직 없습니다.",
    loadError: "과거 데이터를 불러오지 못했습니다.",
    holdingsTitle: "포트폴리오",
    holdingsCount: (count) => `상위 ${count}개 종목 · 순자산 대비 비중`,
    holdingsTotal: (total) => `상위 종목 합계 ${formatNumber(total, 1)}%`,
    holdingsSource: "Yahoo Finance(비공식) 기준. 편입 비중은 리밸런싱 사이에 달라질 수 있습니다.",
    holdingsLoading: "구성 종목을 불러오는 중…",
    holdingsError: "구성 종목을 불러오지 못했습니다.",
    holdingsNone: "피드에 구성 종목이 보고되지 않았습니다.",
    noHoldingsFor: {
      GLD: "실물 금을 보유하는 ETF입니다. 구성 종목이 없습니다.",
      TLT: "미국 장기 국채를 보유하는 ETF입니다. 구성 종목이 없습니다.",
    },
    helpTitle: "이 차트 읽는 법",
    maTitle: "위 패널 · 가격과 200일선",
    maBody:
      "200일 이동평균선은 최근 200거래일 종가의 평균입니다. 현재가가 위에 있으면 장기 추세가 강한 편, 아래에 있으면 약한 편입니다. 소음을 걸러낸 참고선일 뿐이며, 위/아래 위치만으로 매수·매도를 결정할 수는 없습니다.",
    rsiTitle: "아래 패널 · RSI(14)",
    rsiBody:
      "RSI(상대강도지수)는 최근 14일 상승/하락 강도를 0~100으로 나타낸 모멘텀 지표입니다. 30 이하는 과매도(단기 반등 가능성), 70 이상은 과매수(단기 조정 가능성), 30~70은 중립입니다. 약한 하락 추세에서는 30 밑에 오래 머물 수 있으니 지표 하나만으로 판단하면 안 됩니다.",
    readingTitle: "지금 읽으면",
    devAbove: (dev) => `현재가는 200일선보다 ${formatNumber(dev, 1)}% 위에 있고`,
    devBelow: (dev) => `현재가는 200일선보다 ${formatNumber(Math.abs(dev), 1)}% 아래에 있고`,
    rsiOverbought: "과매수 구간",
    rsiOversold: "과매도 구간",
    rsiNeutral: "중립 구간",
    readingVerdict:
      "이 차트는 추세와 단기 과열만 보여줍니다. 지금이 매수·매도 타이밍인지는 밸류에이션과 전체 포트폴리오를 함께 보고 판단해야 하며, 이 차트만으로 투자 결정을 내리기는 어렵습니다. 투자 조언이 아닙니다.",
    helpMore: "방법론에서 정의와 백테스트 전체 보기",
  },
};

function ReadGuideSection({
  copy,
  latest,
  locale,
}: {
  copy: (typeof TEXT)[LocaleKey];
  latest: SectorPoint | null;
  locale: LocaleKey;
}) {
  const dev =
    latest && latest.ma200 !== null && latest.ma200 > 0
      ? ((latest.close - latest.ma200) / latest.ma200) * 100
      : null;
  const rsiTag = latest ? (latest.rsi > 70 ? copy.rsiOverbought : latest.rsi < 30 ? copy.rsiOversold : copy.rsiNeutral) : null;
  const devText = dev === null ? "" : dev >= 0 ? copy.devAbove(dev) : copy.devBelow(dev);
  const readLine = !latest
    ? ""
    : locale === "kr"
      ? `${devText ? `${devText}, ` : ""}RSI(14)는 ${formatNumber(latest.rsi, 1)}로 ${rsiTag}입니다.`
      : `${devText ? `${devText} and ` : ""}RSI(14) reads ${formatNumber(latest.rsi, 1)} — ${rsiTag}.`;

  return (
    <details className="sector-help" open>
      <summary className="sector-help-summary">{copy.helpTitle}</summary>
      <div className="sector-help-body">
        <div className="sector-help-block">
          <div className="sector-help-title">{copy.maTitle}</div>
          <p className="sector-help-text">{copy.maBody}</p>
        </div>
        <div className="sector-help-block">
          <div className="sector-help-title">{copy.rsiTitle}</div>
          <p className="sector-help-text">{copy.rsiBody}</p>
        </div>
        {latest && (
          <div className="sector-help-block sector-help-block-live">
            <div className="sector-help-title">{copy.readingTitle}</div>
            <p className="sector-help-text">
              <strong className="sector-help-reading">{readLine}</strong>
            </p>
            <p className="sector-help-text">{copy.readingVerdict}</p>
          </div>
        )}
        <p className="sector-help-more">
          <a href="/methodology">{copy.helpMore} →</a>
        </p>
      </div>
    </details>
  );
}

function HoldingsSection({
  symbol,
  copy,
  payload,
  loading,
  error,
  locale,
}: {
  symbol: string;
  copy: (typeof TEXT)[LocaleKey];
  payload: EtfHoldingsPayload | null;
  loading: boolean;
  error: string | null;
  locale: LocaleKey;
}) {
  const entry = payload?.etfs[symbol];
  const holdings = entry?.holdings ?? [];
  const maxWeight = holdings.reduce((acc, item) => Math.max(acc, item.weight), 0);
  const total = holdings.reduce((acc, item) => acc + item.weight, 0);
  const sourceDate = payload?.generated_at?.slice(0, 10) ?? null;

  return (
    <div className="sector-holdings">
      <div className="sector-holdings-head">
        <h3 className="sector-holdings-title">{copy.holdingsTitle}</h3>
        {holdings.length > 0 && (
          <span className="sector-holdings-meta">
            {copy.holdingsCount(holdings.length)}
            {sourceDate ? ` · ${formatDate(sourceDate, locale)}` : ""}
          </span>
        )}
      </div>
      {loading ? (
        <p className="sector-holdings-note">{copy.holdingsLoading}</p>
      ) : error ? (
        <p className="sector-holdings-note">{copy.holdingsError} {error}</p>
      ) : holdings.length > 0 ? (
        <>
          <ol className="sector-holdings-list">
            {holdings.map((item) => (
              <li key={item.symbol ?? item.name} className="sector-holdings-row">
                <span className="sector-holdings-symbol">{item.symbol ?? "—"}</span>
                <span className="sector-holdings-name" title={item.name}>{item.name}</span>
                <span className="sector-holdings-bar" aria-hidden="true">
                  <i style={{ width: maxWeight > 0 ? `${(item.weight / maxWeight) * 100}%` : "0%" }} />
                </span>
                <span className="sector-holdings-weight">{formatNumber(item.weight, 1)}%</span>
              </li>
            ))}
          </ol>
          <p className="sector-holdings-foot">
            <span>{copy.holdingsTotal(total)}</span>
            <span>{copy.holdingsSource}</span>
          </p>
        </>
      ) : (
        <p className="sector-holdings-note">{copy.noHoldingsFor[symbol] ?? copy.holdingsNone}</p>
      )}
    </div>
  );
}

export function SectorModal({ symbol, displayName, theme, locale, onClose }: SectorModalProps) {
  const [range, setRange] = useState<string>("1y");
  const history = useSectorHistory(symbol);
  const holdings = useEtfHoldings();
  const copy = TEXT[locale];
  const modalRef = useFocusTrap<HTMLDivElement>(onClose);
  const isNarrow = useMediaQuery();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const allPoints = history.data?.points ?? [];

  const points = useMemo(() => {
    const spec = RANGES.find((item) => item.key === range) ?? RANGES[2];
    if (spec.days === null) return allPoints;
    return allPoints.slice(-spec.days);
  }, [allPoints, range]);

  const option = useMemo(
    () => (points.length > 1 ? sectorChartOption(symbol, points, theme, locale) : null),
    [symbol, points, theme, locale],
  );

  const latest = allPoints.length > 0 ? allPoints[allPoints.length - 1] : null;

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal sector-modal" role="dialog" aria-modal="true" aria-labelledby="sector-modal-title" ref={modalRef} tabIndex={-1}>
        <header className="modal-head">
          <div>
            <div className="eyebrow">{copy.eyebrow}</div>
            <h2 id="sector-modal-title">
              {symbol} <span className="sector-modal-name">{displayName}</span>
            </h2>
            {latest && (
              <div className="modal-subhead sector-modal-stats">
                <span>
                  {copy.price} <strong>${formatNumber(latest.close, 2)}</strong>
                </span>
                {latest.ma200 !== null && (
                  <span>
                    {copy.ma200} ${formatNumber(latest.ma200, 2)}
                  </span>
                )}
                <span>
                  {copy.rsi} {formatNumber(latest.rsi, 1)}
                </span>
                <span>
                  {copy.asOf} {formatDate(latest.date, locale)}
                </span>
              </div>
            )}
          </div>
          <button className="icon-button" onClick={onClose} aria-label={LOCALE_TEXT[locale].close_aria}>
            ×
          </button>
        </header>

        <div className="chart-toolbar">
          <div className="range-buttons" role="group" aria-label={copy.rangeAria}>
            {RANGES.map((item) => (
              <button
                key={item.key}
                className={range === item.key ? "range-button is-active" : "range-button"}
                onClick={() => setRange(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {history.loading ? (
          <div className="chart-skeleton chart-skeleton-large" />
        ) : history.error ? (
          <div className="chart-empty">
            {copy.loadError} {history.error}
          </div>
        ) : option ? (
          <Chart option={option} height={isNarrow ? 260 : 380} ariaLabel={`${symbol} ${copy.chartAria}`} />
        ) : (
          <div className="chart-empty">{copy.noData}</div>
        )}

        <ReadGuideSection copy={copy} latest={latest} locale={locale} />

        <HoldingsSection
          symbol={symbol}
          copy={copy}
          payload={holdings.data}
          loading={holdings.loading}
          error={holdings.error}
          locale={locale}
        />

        <p className="sector-modal-note">{copy.note}</p>
      </div>
    </div>
  );
}
