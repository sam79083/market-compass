import { useEffect, useState } from "react";
import { fetchIndicatorHistory, fetchSectorHistory } from "./api";
import type { IndexKey } from "./api";
import type { IndicatorHistory, RangeKey, SectorHistory } from "./types";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useIndicatorHistory(
  indicatorId: string,
  range: RangeKey,
  enabled = true,
  index: IndexKey = "sp500",
): AsyncState<IndicatorHistory> {
  const [state, setState] = useState<AsyncState<IndicatorHistory>>({
    data: null,
    loading: enabled,
    error: null,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    fetchIndicatorHistory(indicatorId, range, controller.signal, index)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : "Could not load history",
        });
      });
    return () => controller.abort();
  }, [indicatorId, range, enabled, index]);

  return state;
}

export function useSectorHistory(symbol: string): AsyncState<SectorHistory> {
  const [state, setState] = useState<AsyncState<SectorHistory>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });
    fetchSectorHistory(symbol, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : "Could not load history",
        });
      });
    return () => controller.abort();
  }, [symbol]);

  return state;
}
