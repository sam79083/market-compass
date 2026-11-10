import { lazy, Suspense } from "react";
import type { CSSProperties } from "react";
import type { EChartsOption } from "echarts";

const ChartImpl = lazy(() => import("./ChartImpl"));

interface ChartProps {
  option: EChartsOption;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  pointCount?: number;
  onDataZoom?: (start: number, end: number) => void;
}

export function Chart({ option, height = 260, className, style, ariaLabel, pointCount, onDataZoom }: ChartProps) {
  return (
    <Suspense fallback={<div className="chart-skeleton chart-skeleton-large" style={{ height }} />}>
      <ChartImpl option={option} height={height} className={className} style={style} ariaLabel={ariaLabel} pointCount={pointCount} onDataZoom={onDataZoom} />
    </Suspense>
  );
}
