import type { LocaleKey } from "./i18n";

export interface MarketEvent {
  /** YYYY-MM-DD of the trading day the event is tied to (crash bottom, shock day, ...). */
  date: string;
  /** Short chip/label text, shown on the marker chip under the chart. */
  en: string;
  kr: string;
  /** One-line explanation shown in the detail line when the event is hovered or tapped. */
  descriptionEn: string;
  descriptionKr: string;
}

/**
 * Major US equity market events, drawn as dashed vertical lines on the price chart.
 * Hovering/tapping a chip under the chart reveals the description. This list is
 * curated by hand on purpose: unlike prices, "what counts as a major event" is an
 * editorial call. To add one, append an entry here (date + en/kr label + description).
 * A future entry with a date beyond the history range simply stays hidden until the
 * data reaches it.
 */
export const MARKET_EVENTS: MarketEvent[] = [
  {
    date: "1998-09-23",
    en: "LTCM '98",
    kr: "LTCM '98",
    descriptionEn: "Long-Term Capital Management nearly collapses; the Fed orchestrates a private bailout to contain systemic risk.",
    descriptionKr: "LTCM(롱텀캐피털) 파산 직전 — 연준이 시스템 리스크 확산을 막기 위해 민간 구제를 주도.",
  },
  {
    date: "2000-03-10",
    en: "Dot-com peak",
    kr: "닷컴 정점",
    descriptionEn: "NASDAQ tops at 5,048 — the peak before a ~78% dot-com crash over the next two years.",
    descriptionKr: "나스닥 5,048 고점 — 이후 2년간 약 -78% 닷컴 버블 붕괴.",
  },
  {
    date: "2001-09-17",
    en: "9/11",
    kr: "9·11",
    descriptionEn: "Markets reopen after the 9/11 attacks — the NYSE was closed from September 11 to 16, the longest halt since 1933.",
    descriptionKr: "9·11 테러 이후 첫 거래일 — NYSE, 9월 11일부터 16일까지 1933년 이후 최장기 휴장.",
  },
  {
    date: "2008-09-15",
    en: "Lehman '08",
    kr: "리먼 '08",
    descriptionEn: "Lehman Brothers files for bankruptcy; the global financial crisis begins in earnest — S&P 500 falls ~57% peak-to-trough.",
    descriptionKr: "리먼브라더스 파산 — 글로벌 금융위기 본격화. S&P 500, 고점 대비 약 -57%.",
  },
  {
    date: "2010-05-06",
    en: "Flash Crash",
    kr: "플래시 크래시",
    descriptionEn: "Stocks plunge ~9% in minutes and rebound — a feedback loop driven by high-frequency trading and liquidity withdrawal.",
    descriptionKr: "수분 만에 약 -9% 폭락 후 급반등 — 고빈도 매매 환류와 유동성 철수로 추정.",
  },
  {
    date: "2011-08-08",
    en: "US downgrade",
    kr: "미국 등급 강등",
    descriptionEn: "S&P strips the U.S. of its AAA rating on August 5; stocks open Monday down ~6–7%.",
    descriptionKr: "S&P, 8월 5일 미국 AAA 등급 박탈 — 주간 첫 거래일 증시 약 -6~7% 개장.",
  },
  {
    date: "2015-08-24",
    en: "China shock",
    kr: "차이나 쇼크",
    descriptionEn: "China's yuan devaluation triggers 'Black Monday' — the Dow drops 1,000+ points intraday.",
    descriptionKr: "중국 위안화 평가절하 — '블랙 먼데이', 다우 장중 1,000포인트 이상 폭락.",
  },
  {
    date: "2020-03-23",
    en: "COVID crash",
    kr: "코로나 폭락",
    descriptionEn: "Pandemic bottom after ~-34% in 23 trading days; the Fed cuts rates to zero and launches unlimited QE.",
    descriptionKr: "코로나 폭락 저점 — 23거래일간 약 -34%. 연준 제로금리·무제한 양적완화.",
  },
  {
    date: "2022-06-16",
    en: "Rate shock",
    kr: "금리 쇼크",
    descriptionEn: "Fed hikes 75bp — its largest move since 1994 — as CPI hits 9.1%; the S&P 500 falls ~25% from its high.",
    descriptionKr: "연준 1994년 이후 최대 75bp 인상 — CPI 9.1%, S&P 500 고점 대비 약 -25%.",
  },
  {
    date: "2023-03-10",
    en: "SVB '23",
    kr: "SVB '23",
    descriptionEn: "Silicon Valley Bank collapses — the largest U.S. bank failure since 2008 — sparking regional bank turmoil.",
    descriptionKr: "SVB 파산 — 2008년 이후 최대 미국 은행 붕괴, 지역은행 위기 확산.",
  },
  {
    date: "2024-08-05",
    en: "Yen carry",
    kr: "엔캐리 '24",
    descriptionEn: "Yen carry trades unwind after the BoJ hikes — the Nikkei falls ~12% in a day and global volatility spikes.",
    descriptionKr: "일본은행 금리 인상 — 엔캐리 트레이드 청산, 닛케이 하루 -12%, 글로벌 변동성 폭증.",
  },
  {
    date: "2025-04-02",
    en: "Tariffs '25",
    kr: "관세 '25",
    descriptionEn: "'Liberation Day' tariff package announced — equities drop ~10% in days and Treasury yields spike.",
    descriptionKr: "'해방의 날' 관세 패키지 발표 — 증시 수일 만에 약 -10%, 미국채 금리 급등.",
  },
];

/** Events that fall inside [firstDate, lastDate] (inclusive), i.e. visible on the chart. */
export function eventsInRange(firstDate: string, lastDate: string): MarketEvent[] {
  return MARKET_EVENTS.filter((event) => event.date >= firstDate && event.date <= lastDate);
}

export function eventLabel(event: MarketEvent, locale: LocaleKey): string {
  return locale === "kr" ? event.kr : event.en;
}

export function eventDescription(event: MarketEvent, locale: LocaleKey): string {
  return locale === "kr" ? event.descriptionKr : event.descriptionEn;
}
