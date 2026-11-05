import type { LocaleKey } from "./i18n";
import type { Band, RangeKey } from "./types";

export const DEFAULT_BANDS: Band[] = [
  { key: "very_overvalued", label: "Very Overvalued", min: 0, max: 20, color: "#e06c75" },
  { key: "overvalued", label: "Overvalued", min: 20, max: 40, color: "#e39a5c" },
  { key: "neutral", label: "Neutral", min: 40, max: 60, color: "#d8c07a" },
  { key: "undervalued", label: "Undervalued", min: 60, max: 80, color: "#6fcfb2" },
  { key: "very_undervalued", label: "Very Undervalued", min: 80, max: 100, color: "#4fb98a" },
];

const CATEGORY_COLORS: Record<string, string> = {
  fundamental: "#d8b26a",
  relative: "#7aa2f7",
  sentiment: "#c792ea",
  breadth: "#6fcfb2",
};

const STATUS_COLORS: Record<string, string> = {
  fresh: "#6fcfb2",
  stored: "#7aa2f7",
  degraded: "#e39a5c",
  stale: "#e39a5c",
  unscored: "#8b9aa8",
  unavailable: "#8b9aa8",
  unknown: "#8b9aa8",
};

export function bandForScore(score: number | null, bands: Band[] = DEFAULT_BANDS): Band {
  if (score === null || !Number.isFinite(score)) {
    return { key: "unavailable", label: "Insufficient data", min: 0, max: 100, color: "#8b9aa8" };
  }
  return bands.find((band) => score >= band.min && score < band.max) ?? bands[bands.length - 1];
}

export function scoreColor(score: number | null): string {
  return bandForScore(score).color;
}

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#d8b26a";
}

export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? STATUS_COLORS.unknown;
}

export function statusLabel(status: string, locale: LocaleKey = "en"): string {
  const t = LOCALE_HELPER_TEXT[locale];
  return t.status[status] ?? t.status.unknown;
}

export function qualityLabels(
  quality: string | null | undefined,
  locale: LocaleKey = "en",
): string[] {
  if (!quality) return [];
  const t = LOCALE_HELPER_TEXT[locale];
  return quality
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => t.quality[item] ?? item.replaceAll("_", " "));
}

const LOCALE_HELPER_TEXT = {
  en: {
    status: {
      fresh: "Fresh",
      stored: "Stored",
      degraded: "Degraded",
      stale: "Stale",
      unscored: "Unscored",
      unavailable: "Unavailable",
      unknown: "Unknown",
    } as Record<string, string>,
    quality: {
      ok: "OK",
      proxy: "Trailing proxy",
      survivorship: "Survivorship bias",
      short_window: "Short window",
      supplementary: "Supplementary",
      direct_scale: "Direct scale",
    } as Record<string, string>,
  },
  kr: {
    status: {
      fresh: "최신",
      stored: "저장됨",
      degraded: "일부 저하",
      stale: "데이터 경과",
      unscored: "미채점",
      unavailable: "이용 불가",
      unknown: "알 수 없음",
    } as Record<string, string>,
    quality: {
      ok: "정상",
      proxy: "후행 추정치",
      survivorship: "생존편향",
      short_window: "짧은 기간",
      supplementary: "보조 지표",
      direct_scale: "직접 스케일",
    } as Record<string, string>,
  },
};

export function formatDate(
  value: string | null | undefined,
  locale: LocaleKey = "en",
): string {
  if (!value) return "—";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "kr" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function formatDateTime(
  value: string | null | undefined,
  locale: LocaleKey = "en",
): string {
  if (!value) return "—";
  const normalized = /[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "kr" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatCoverage(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${formatNumber(value * 100, digits)}%`;
}

export function formatSigned(value: number | null | undefined, digits = 2, suffix = ""): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, digits)}${suffix}`;
}

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return Math.round(value).toString();
}

export function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character + character)
          .join("")
      : normalized;
  const value = Number.parseInt(full, 16);
  if (Number.isNaN(value)) return `rgba(216, 178, 106, ${alpha})`;
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function rangeStart(latest: string | null | undefined, range: RangeKey): string | null {
  if (!latest || range === "max") return null;
  const years = Number.parseInt(range.replace("y", ""), 10);
  if (!Number.isFinite(years)) return null;
  const date = new Date(`${latest.slice(0, 10)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - Math.round(years * 365.25));
  return date.toISOString().slice(0, 10);
}

export function filterByRange<T extends { date: string }>(
  points: T[],
  latest: string | null | undefined,
  range: RangeKey,
): T[] {
  const start = rangeStart(latest, range);
  if (!start) return points;
  return points.filter((point) => point.date >= start);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function percentChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return (current / previous - 1) * 100;
}
