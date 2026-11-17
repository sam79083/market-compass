import { useEffect, useRef, useState } from "react";
import { fetchIndicatorHistory, fetchSectorHistory, fetchEtfHoldings, fetchSparklines } from "./api";
import type { IndexKey } from "./api";
import type {
  IndicatorHistory,
  RangeKey,
  SectorHistory,
  EtfHoldingsPayload,
  SparklinesPayload,
} from "./types";

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

/**
 * Focus trap for modal dialogs: focuses the dialog on mount, cycles Tab/Shift+Tab
 * within it, closes on Escape, and returns focus to the element that opened it.
 */
export function useFocusTrap<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const previous = document.activeElement as HTMLElement | null;
    node.focus();

    const focusable = () =>
      Array.from(
        node.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = active !== null && node.contains(active);
      if (event.shiftKey) {
        if (!inside || active === first) {
          last.focus();
          event.preventDefault();
        }
      } else if (!inside || active === last) {
        first.focus();
        event.preventDefault();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, []);

  return ref;
}

/** True while the viewport is narrower than maxWidth (defaults to 560px). */
export function useMediaQuery(query = "(max-width: 560px)"): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export function useSparklines(index: IndexKey): AsyncState<SparklinesPayload> {
  const [state, setState] = useState<AsyncState<SparklinesPayload>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });
    fetchSparklines(index, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : "Could not load sparklines",
        });
      });
    return () => controller.abort();
  }, [index]);

  return state;
}

export function useEtfHoldings(): AsyncState<EtfHoldingsPayload> {
  const [state, setState] = useState<AsyncState<EtfHoldingsPayload>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });
    fetchEtfHoldings(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : "Could not load holdings",
        });
      });
    return () => controller.abort();
  }, []);

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
