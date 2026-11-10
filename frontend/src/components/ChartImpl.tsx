import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { EChartsOption } from "echarts";
import { init, use } from "echarts/core";
import type { ECharts } from "echarts/core";
import { GaugeChart, LineChart } from "echarts/charts";
import {
  AxisPointerComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

use([
  LineChart,
  GaugeChart,
  GridComponent,
  DataZoomComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  MarkAreaComponent,
  AxisPointerComponent,
  CanvasRenderer,
]);

interface ChartImplProps {
  option: EChartsOption;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  pointCount?: number;
  onDataZoom?: (start: number, end: number) => void;
}

export function ChartImpl({ option, height = 260, className, style, ariaLabel, pointCount, onDataZoom }: ChartImplProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ECharts | null>(null);
  const pointCountRef = useRef(pointCount ?? 0);
  pointCountRef.current = pointCount ?? 0;
  const onDataZoomRef = useRef(onDataZoom);
  onDataZoomRef.current = onDataZoom;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chart = init(container, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(container);
    const handler = (raw: unknown) => {
      const batch = (raw as { batch?: Array<{ start?: number; end?: number }> } | null)?.batch?.[0]
        ?? (raw as { start?: number; end?: number } | null);
      const total = Math.max(2, pointCountRef.current);
      const startPct = typeof batch?.start === "number" ? batch.start : 0;
      const endPct = typeof batch?.end === "number" ? batch.end : 100;
      const start = Math.round((Math.min(startPct, endPct) / 100) * (total - 1));
      const end = Math.round((Math.max(startPct, endPct) / 100) * (total - 1));
      onDataZoomRef.current?.(start, end);
    };
    chart.on("datazoom", handler);
    return () => {
      chart.off("datazoom", handler);
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true, lazyUpdate: true });
  }, [option]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height, ...style }}
      role="img"
      aria-label={ariaLabel}
    />
  );
}

export default ChartImpl;
