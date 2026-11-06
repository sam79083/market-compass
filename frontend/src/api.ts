import type {
  CompositeHistory,
  Dashboard,
  IndicatorHistory,
  Methodology,
  RangeKey,
} from "./types";

const rawBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? "";

export const apiBase = rawBase
  ? rawBase.startsWith("http")
    ? rawBase.replace(/\/$/, "")
    : `https://${rawBase.replace(/\/$/, "")}`
  : "";

const rawMode = (import.meta.env.VITE_DATA_MODE as string | undefined)?.trim().toLowerCase();

const staticMode =
  rawMode === "static" || (rawMode !== "api" && import.meta.env.PROD && !rawBase);

export type IndexKey = "sp500" | "nasdaq";

export const dataSourceLabel = staticMode ? "Static snapshot" : apiBase || "same origin";

export const isStaticMode = staticMode;

export const validationUrl = staticMode ? "/data/validation.json" : `${apiBase}/api/validation`;

function dataPath(path: string): string {
  return staticMode ? `/data${path}` : `${apiBase}/api${path}`;
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal,
    cache: "no-cache",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) detail = payload.detail;
    } catch {
      // Keep the HTTP status text when the body is not JSON.
    }
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

export function fetchDashboard(signal?: AbortSignal, index?: IndexKey): Promise<Dashboard> {
  const url = index
    ? staticMode ? `/data/dashboard.${index}.json` : `${dataPath("/dashboard")}?index=${index}`
    : staticMode ? "/data/dashboard.json" : dataPath("/dashboard");
  return getJson<Dashboard>(url, signal);
}

export function fetchCompositeHistory(
  range: RangeKey = "max",
  signal?: AbortSignal,
  index: IndexKey = "sp500",
): Promise<CompositeHistory> {
  const url = staticMode
    ? index === "nasdaq"
      ? "/data/composite-history.nasdaq.json"
      : "/data/composite-history.json"
    : dataPath(`/composite/history?range=${range}&index=${index}`);
  return getJson<CompositeHistory>(url, signal);
}

export function fetchIndicatorHistory(
  indicatorId: string,
  range: RangeKey = "10y",
  signal?: AbortSignal,
  index: IndexKey = "sp500",
): Promise<IndicatorHistory> {
  const encoded = encodeURIComponent(indicatorId);
  const staticPath =
    index === "nasdaq" ? `/data/indicators/nasdaq/${encoded}.json` : `/data/indicators/${encoded}.json`;
  return getJson<IndicatorHistory>(
    staticMode ? staticPath : dataPath(`/indicators/${encoded}/history?range=${range}&index=${index}`),
    signal,
  );
}

export function fetchMethodology(signal?: AbortSignal): Promise<Methodology> {
  return getJson<Methodology>(
    staticMode ? "/data/methodology.json" : dataPath("/methodology"),
    signal,
  );
}
