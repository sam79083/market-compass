import type { LocaleKey } from "./i18n";

export interface MarketEvent {
  /** YYYY-MM-DD of the trading day the event is tied to (crash bottom, shock day, ...). */
  date: string;
  en: string;
  kr: string;
}

/**
 * Major US equity market events, drawn as dashed vertical lines on the top-of-page
 * price chart. Labels stay short so they fit on the "Max" view without overlapping.
 */
export const MARKET_EVENTS: MarketEvent[] = [
  { date: "1998-09-23", en: "LTCM '98", kr: "LTCM '98" },
  { date: "2000-03-10", en: "Dot-com peak '00", kr: "닷컴 '00" },
  { date: "2001-09-17", en: "9/11", kr: "9·11" },
  { date: "2008-09-15", en: "Lehman '08", kr: "리먼 '08" },
  { date: "2010-05-06", en: "Flash Crash '10", kr: "플래시 '10" },
  { date: "2011-08-08", en: "US downgrade '11", kr: "미국 강등 '11" },
  { date: "2015-08-24", en: "China shock '15", kr: "차이나 '15" },
  { date: "2020-03-23", en: "COVID crash '20", kr: "코로나 '20" },
  { date: "2022-06-16", en: "Rate shock '22", kr: "금리 '22" },
  { date: "2023-03-10", en: "SVB '23", kr: "SVB '23" },
  { date: "2024-08-05", en: "Yen carry '24", kr: "엔캐리 '24" },
  { date: "2025-04-02", en: "Tariffs '25", kr: "관세 '25" },
];

/** Events that fall inside [firstDate, lastDate] (inclusive), i.e. visible on the chart. */
export function eventsInRange(firstDate: string, lastDate: string): MarketEvent[] {
  return MARKET_EVENTS.filter((event) => event.date >= firstDate && event.date <= lastDate);
}

export function eventLabel(event: MarketEvent, locale: LocaleKey): string {
  return locale === "kr" ? event.kr : event.en;
}
