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
}

export function Chart({ option, height = 260, className, style, ariaLabel }: ChartProps) {
  return (
    <Suspense fallback={<div className="chart-skeleton chart-skeleton-large" style={{ height }} />}>
      <ChartImpl option={option} height={height} className={className} style={style} ariaLabel={ariaLabel} />
    </Suspense>
  );
}
