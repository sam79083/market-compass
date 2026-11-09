import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { EChartsOption } from "echarts";
import { init, use } from "echarts/core";
import type { ECharts } from "echarts/core";
import { GaugeChart, LineChart } from "echarts/charts";
import {
  AxisPointerComponent,
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
}

export function ChartImpl({ option, height = 260, className, style, ariaLabel }: ChartImplProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ECharts | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chart = init(container, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(container);
    return () => {
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
