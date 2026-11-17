import type { LocaleKey } from "./i18n";

export interface MarketEvent {
  /** YYYY-MM-DD of the trading day the event is tied to (crash bottom, shock day, ...). */
  date: string;
  /** YYYY-MM-DD of the first and last trading day of the incident's acute phase; shaded when the chip is toggled. */
  start: string;
  end: string;
  /** Short chip/label text, shown on the marker chip under the chart. */
  en: string;
  kr: string;
  /** One-to-two line explanation with the approximate date range and magnitude. */
  descriptionEn: string;
  descriptionKr: string;
}

/**
 * Major US equity market events, drawn as dashed vertical lines on the price chart.
 * The chips under the chart toggle a shaded region covering the incident's acute
 * phase (start..end), so each event reads as a period, not a single day. This list is
 * curated by hand on purpose: unlike prices, "what counts as a major event" is an
 * editorial call. To add one, append an entry here (date + start/end + en/kr labels +
 * description). A future entry with a date beyond the history range simply stays
 * hidden until the data reaches it.
 *
 * Magnitudes are approximate (\"~\") and measured on S&P 500 (via the app's own SPY
 * price history) within the start..end window, except where noted.
 */
export const MARKET_EVENTS: MarketEvent[] = [
  {
    date: "1998-09-23",
    start: "1998-08-17",
    end: "1998-10-08",
    en: "LTCM '98",
    kr: "LTCM '98",
    descriptionEn:
      "Aug–Oct 1998 · S&P 500 −11% (−19% from the July peak). Russia defaults; LTCM nearly collapses — the Fed brokers a private bailout to contain systemic risk.",
    descriptionKr:
      "1998.8~10월 · S&P 500 -11%(7월 고점 대비 -19%) · 러시아 디폴트, LTCM 파산 위기 — 연준이 민간 구제를 주도해 진정.",
  },
  {
    date: "2000-03-10",
    start: "2000-03-10",
    end: "2002-10-09",
    en: "Dot-com peak",
    kr: "닷컴 정점",
    descriptionEn:
      "Mar 2000–Oct 2002 · NASDAQ −78%, S&P 500 −44%. The dot-com bubble unwinds over two and a half years.",
    descriptionKr:
      "2000.3~2002.10월 · 나스닥 -78%, S&P 500 -44% · 닷컴 버블 붕괴 — 2년 반에 걸쳐 하락.",
  },
  {
    date: "2001-09-17",
    start: "2001-09-17",
    end: "2001-09-21",
    en: "9/11",
    kr: "9·11",
    descriptionEn:
      "Sep 2001 · S&P 500 −12% over the first week. Markets reopen Sep 17 after the longest NYSE halt since 1933.",
    descriptionKr:
      "2001.9월 · S&P 500 -12%(첫 주간) · 9·11 이후 첫 개장 — NYSE, 9월 11~16일 휴장(1933년 이후 최장).",
  },
  {
    date: "2008-09-15",
    start: "2008-09-15",
    end: "2009-03-09",
    en: "Lehman '08",
    kr: "리먼 '08",
    descriptionEn:
      "Sep 2008–Mar 2009 · S&P 500 −43% (−57% from the Oct 2007 peak). Lehman Brothers files for bankruptcy — the global financial crisis begins in earnest.",
    descriptionKr:
      "2008.9~2009.3월 · S&P 500 -43%(2007.10 고점 대비 -57%) · 리먼 파산 — 글로벌 금융위기 본격화.",
  },
  {
    date: "2010-05-06",
    start: "2010-05-06",
    end: "2010-05-06",
    en: "Flash Crash",
    kr: "플래시 크래시",
    descriptionEn:
      "May 6 2010 · Intraday −9% in minutes, full rebound by the close — a high-frequency trading feedback loop and liquidity withdrawal.",
    descriptionKr:
      "2010.5.6 · 장중 -9%(수분 만에), 종가는 보합 · 고빈도 매매 환류와 유동성 철수가 원인으로 추정.",
  },
  {
    date: "2011-08-08",
    start: "2011-07-29",
    end: "2011-10-04",
    en: "US downgrade",
    kr: "미국 등급 강등",
    descriptionEn:
      "Aug–Oct 2011 · S&P 500 −15% (from the July peak). S&P strips the U.S. of its AAA rating — stocks open ~−7% on Aug 8.",
    descriptionKr:
      "2011.8~10월 · S&P 500 -15%(7월 고점 대비) · S&P가 미국 AAA 등급 박탈 — 8월 8일 증시 약 -7% 개장.",
  },
  {
    date: "2015-08-24",
    start: "2015-08-11",
    end: "2015-09-28",
    en: "China shock",
    kr: "차이나 쇼크",
    descriptionEn:
      "Aug–Sep 2015 · S&P 500 −10% (Aug 25 trough). China's yuan devaluation triggers 'Black Monday' — the Dow drops 1,000+ points intraday.",
    descriptionKr:
      "2015.8~9월 · S&P 500 -10%(8월 25일 저점) · 중국 위안화 평가절하, '블랙 먼데이' — 다우 장중 -1,000포인트.",
  },
  {
    date: "2020-03-23",
    start: "2020-02-19",
    end: "2020-03-23",
    en: "COVID crash",
    kr: "코로나 폭락",
    descriptionEn:
      "Feb–Mar 2020 · S&P 500 −34% in 23 sessions. Pandemic panic — the Fed cuts rates to zero and launches unlimited QE.",
    descriptionKr:
      "2020.2~3월 · S&P 500 -34%(23거래일) · 코로나 팬데믹 — 연준 제로금리와 무제한 양적완화.",
  },
  {
    date: "2022-06-16",
    start: "2022-01-03",
    end: "2022-10-12",
    en: "Rate shock",
    kr: "금리 쇼크",
    descriptionEn:
      "Jan–Oct 2022 · S&P 500 −25%. Fed hikes 75bp (largest move since 1994) as CPI hits 9.1%.",
    descriptionKr:
      "2022.1~10월 · S&P 500 -25% · CPI 9.1% — 연준, 1994년 이후 최대 폭 75bp 인상.",
  },
  {
    date: "2023-03-10",
    start: "2023-03-10",
    end: "2023-05-01",
    en: "SVB '23",
    kr: "SVB '23",
    descriptionEn:
      "Mar–May 2023 · S&P 500 roughly flat, but KBW regional banks −30%. SVB collapses — the largest U.S. bank failure since 2008.",
    descriptionKr:
      "2023.3~5월 · S&P 500 보합, 지역은행지수(KBW) -30% · SVB 파산 — 2008년 이후 최대 은행 붕괴.",
  },
  {
    date: "2024-08-05",
    start: "2024-07-31",
    end: "2024-08-14",
    en: "Yen carry",
    kr: "엔캐리 '24",
    descriptionEn:
      "Jul–Aug 2024 · S&P 500 −6%, Nikkei −12% in one day (Aug 5). BoJ hike unwinds the yen carry trade and spikes global volatility.",
    descriptionKr:
      "2024.7~8월 · S&P 500 -6%, 닛케이 -12%(8월 5일) · 일본은행 금리 인상 — 엔캐리 트레이드 청산, 글로벌 변동성 급증.",
  },
  {
    date: "2025-04-02",
    start: "2025-04-02",
    end: "2025-04-09",
    en: "Tariffs '25",
    kr: "관세 '25",
    descriptionEn:
      "Apr 2025 · S&P 500 −12% in four sessions, rebounding after the 90-day pause (Apr 9). 'Liberation Day' tariff package announced.",
    descriptionKr:
      "2025.4월 · S&P 500 -12%(4거래일), 90일 유예(4월 9일) 후 반등 · '해방의 날' 관세 패키지.",
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
