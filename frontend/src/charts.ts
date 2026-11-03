import type { EChartsOption } from "echarts";
import type {
  Band,
  CompositePoint,
  Indicator,
  IndicatorHistory,
  IndicatorPoint,
  ThemeMode,
} from "./types";
import { chartPalettes } from "./theme";
import {
  bandForScore,
  categoryColor,
  escapeHtml,
  formatCoverage,
  formatDate,
  formatNumber,
  formatScore,
  hexToRgba,
  scoreColor,
  titleCase,
} from "./utils";

function axisLabel(palette: ReturnType<typeof paletteFor>) {
  return { color: palette.muted, fontSize: 10 };
}

function paletteFor(theme: ThemeMode) {
  return chartPalettes[theme];
}

function tooltipStyle(theme: ThemeMode) {
  const palette = paletteFor(theme);
  return {
    backgroundColor: palette.tooltipBg,
    borderColor: palette.tooltipBorder,
    borderWidth: 1,
    padding: [10, 12],
    textStyle: { color: palette.text, fontSize: 12 },
    extraCssText: `box-shadow: 0 18px 40px ${palette.tooltipShadow}; border-radius: 10px;`,
  };
}

function areaGradient(color: string, alpha: number) {
  return {
    type: "linear" as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: hexToRgba(color, alpha) },
      { offset: 1, color: hexToRgba(color, 0) },
    ],
  };
}

function dateAxis(dates: string[], palette: ReturnType<typeof paletteFor>, show = true) {
  return {
    type: "category" as const,
    data: dates,
    boundaryGap: false,
    show,
    axisLine: { lineStyle: { color: palette.axis } },
    axisTick: { show: false },
    axisLabel: {
      ...axisLabel(palette),
      hideOverlap: true,
      formatter: (value: string) => value.slice(0, 4),
    },
  };
}

function valueAxis(
  palette: ReturnType<typeof paletteFor>,
  options: Record<string, unknown> = {},
) {
  return {
    type: "value" as const,
    scale: true,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { ...axisLabel(palette), formatter: (value: number) => formatNumber(value, 1) },
    splitLine: { lineStyle: { color: palette.grid } },
    ...options,
  };
}

function tooltipRow(label: string, value: string, color?: string): string {
  return `<div class="chart-tip-row"><span>${
    color ? `<i class="chart-tip-dot" style="background:${color}"></i>` : ""
  }${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

export function gaugeOption(score: number | null, theme: ThemeMode): EChartsOption {
  const palette = paletteFor(theme);
  const bands = [
    { value: 20, color: "#e06c75" },
    { value: 40, color: "#e39a5c" },
    { value: 60, color: "#d8c07a" },
    { value: 80, color: "#6fcfb2" },
    { value: 100, color: "#4fb98a" },
  ];
  const available = score !== null && Number.isFinite(score);
  return {
    animationDuration: 900,
    series: [
      {
        type: "gauge",
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        center: ["50%", "58%"],
        radius: "100%",
        axisLine: {
          lineStyle: {
            width: 12,
            color: bands.map((band) => [band.value / 100, band.color]),
          },
        },
        pointer: {
          show: available,
          length: "56%",
          width: 4,
          itemStyle: { color: palette.text },
        },
        anchor: {
          show: available,
          size: 10,
          itemStyle: { color: palette.text, borderColor: palette.panel, borderWidth: 3 },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        title: {
          offsetCenter: [0, "66%"],
          color: palette.muted,
          fontSize: 11,
          fontFamily: "Inter, Segoe UI, sans-serif",
        },
        detail: {
          offsetCenter: [0, "34%"],
          color: palette.text,
          fontSize: 46,
          fontWeight: 500,
          fontFamily: "Georgia, Iowan Old Style, serif",
          formatter: (value: number) => (available ? Math.round(value).toString() : "—"),
        },
        data: [{ value: available ? score : 0, name: "Composite score" }],
      },
    ],
  };
}

export function sparklineOption(
  points: IndicatorPoint[],
  indicator: Indicator,
  theme: ThemeMode,
): EChartsOption {
  const color = categoryColor(indicator.category);
  const usable = points.filter((point) => Number.isFinite(point.value));
  return {
    animation: false,
    grid: { left: 2, right: 2, top: 4, bottom: 2 },
    xAxis: { type: "category", data: usable.map((point) => point.date), show: false, boundaryGap: false },
    yAxis: { type: "value", show: false, scale: true },
    tooltip: { show: false },
    series: [
      {
        type: "line",
        data: usable.map((point) => point.value),
        showSymbol: false,
        silent: true,
        smooth: 0.22,
        lineStyle: { color, width: 1.7 },
        areaStyle: { color: areaGradient(color, theme === "dark" ? 0.26 : 0.18) },
      },
    ],
  };
}

export function compositeChartOption(
  points: CompositePoint[],
  bands: Band[],
  theme: ThemeMode,
  indicatorNames: Record<string, string>,
): EChartsOption {
  const palette = paletteFor(theme);
  const dates = points.map((point) => point.date);
  const values = points.map((point) => point.score);
  const latest = points[points.length - 1];
  const latestColor = bandForScore(latest?.score ?? null, bands).color;

  const markAreaData: Array<
    [{ yAxis: number; itemStyle: { color: string } }, { yAxis: number }]
  > = bands.map((band) => [
    {
      yAxis: band.min,
      itemStyle: { color: hexToRgba(band.color, theme === "dark" ? 0.055 : 0.09) },
    },
    { yAxis: band.max },
  ]);

  const markLines = [20, 40, 60, 80].map((value) => ({
    yAxis: value,
    lineStyle: { color: palette.axis, type: "dashed" as const, width: 1 },
    label: { show: false },
  }));

  return {
    animationDuration: 500,
    grid: { left: 46, right: 16, top: 18, bottom: 28 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "line", lineStyle: { color: palette.accent, type: "dashed" } },
      ...tooltipStyle(theme),
      formatter: (params: unknown) => {
        const list = params as Array<{ dataIndex: number }>;
        const point = points[list[0]?.dataIndex ?? 0];
        if (!point) return "";
        const components = Object.entries(point.components)
          .filter(([, component]) => component.available && component.score !== null)
          .sort(([, left], [, right]) => right.weight - left.weight)
          .map(([id, component]) =>
            tooltipRow(
              indicatorNames[id] ?? titleCase(id),
              `${formatScore(component.score)}/100`,
              scoreColor(component.score),
            ),
          )
          .join("");
        return `<div class="chart-tip">
          <div class="chart-tip-head"><span>${escapeHtml(formatDate(point.date))}</span><strong style="color:${bandForScore(
            point.score,
            bands,
          ).color}">${formatScore(point.score)}/100</strong></div>
          <div class="chart-tip-sub">${escapeHtml(point.classification)} · coverage ${formatCoverage(
            point.coverage,
          )} · ${escapeHtml(point.confidence)} confidence</div>
          <div class="chart-tip-list">${components}</div>
        </div>`;
      },
    },
    xAxis: dateAxis(dates, palette),
    yAxis: valueAxis(palette, {
      min: 0,
      max: 100,
      interval: 20,
      scale: false,
      axisLabel: { ...axisLabel(palette), formatter: (value: number) => `${value}` },
    }),
    series: [
      {
        name: "Composite",
        type: "line",
        data: values,
        showSymbol: false,
        smooth: 0.16,
        lineStyle: { color: palette.accent, width: 2.2 },
        areaStyle: { color: areaGradient(palette.accent, theme === "dark" ? 0.22 : 0.16) },
        markArea: { silent: true, data: markAreaData },
        markLine: { silent: true, symbol: "none", data: markLines },
        emphasis: { focus: "series" },
      },
      {
        name: "Latest",
        type: "line",
        data: points.map((point, index) =>
          index === points.length - 1 ? point.score : null,
        ),
        showSymbol: true,
        symbol: "circle",
        symbolSize: 7,
        itemStyle: { color: latestColor, borderColor: palette.panel, borderWidth: 2 },
        lineStyle: { opacity: 0 },
        silent: true,
        z: 5,
      },
    ],
  };
}

export function indicatorChartOption(
  history: IndicatorHistory,
  indicator: Indicator,
  theme: ThemeMode,
): EChartsOption {
  const palette = paletteFor(theme);
  const points = history.points;
  const dates = points.map((point) => point.date);
  const isMulti = indicator.chart_kind === "ma200" || indicator.chart_kind === "relative";
  const primaryColor = categoryColor(indicator.category);

  const base = {
    animationDuration: 450,
    grid: { left: 48, right: 18, top: isMulti ? 34 : 16, bottom: 28 },
    tooltip: {
      trigger: "axis" as const,
      axisPointer: { type: "line" as const, lineStyle: { color: palette.accent, type: "dashed" as const } },
      ...tooltipStyle(theme),
      formatter: (params: unknown) => {
        const list = params as Array<{ dataIndex: number }>;
        const point = points[list[0]?.dataIndex ?? 0];
        if (!point) return "";
        const header = `<div class="chart-tip-head"><span>${escapeHtml(
          formatDate(point.date),
        )}</span><strong>${escapeHtml(point.display)}</strong></div>`;
        if (indicator.chart_kind === "ma200") {
          return `<div class="chart-tip">${header}
            <div class="chart-tip-list">
              ${tooltipRow("S&P 500", formatNumber(point.price, 2), palette.accent)}
              ${tooltipRow("200-day average", formatNumber(point.ma200, 2), palette.blue)}
              ${tooltipRow("Deviation", `${formatNumber(point.value, 2)}%`, scoreColor(50 + point.value))}
              ${tooltipRow("20-day MA slope", `${formatNumber(point.ma200_slope_20d, 2)}%`, palette.muted)}
            </div>
            <div class="chart-tip-sub">${escapeHtml(indicator.short_name)} · ${escapeHtml(
              point.effective_date,
            )}${point.is_estimate ? " · preliminary" : ""}</div>
          </div>`;
        }
        if (indicator.chart_kind === "relative") {
          return `<div class="chart-tip">${header}
            <div class="chart-tip-list">
              ${tooltipRow("RSP (normalized)", formatNumber(point.rsp_norm, 1), palette.teal)}
              ${tooltipRow("SPY (normalized)", formatNumber(point.spy_norm, 1), palette.blue)}
              ${tooltipRow("RSP / SPY ratio", formatNumber(point.value, 3), primaryColor)}
              ${tooltipRow("252-day change", `${formatNumber(point.rel_252d, 2)}%`, palette.muted)}
            </div>
            <div class="chart-tip-sub">Total-return proxy · ${escapeHtml(point.effective_date)}</div>
          </div>`;
        }
        return `<div class="chart-tip">${header}
          <div class="chart-tip-sub">${escapeHtml(indicator.frequency)} · ${escapeHtml(
            point.effective_date,
          )}${point.is_estimate ? " · preliminary" : ""}</div>
          ${
            indicator.id === "erp"
              ? `<div class="chart-tip-list">${tooltipRow(
                  "Earnings yield",
                  `${formatNumber(point.earnings_yield, 2)}%`,
                  palette.teal,
                )}${tooltipRow(
                  "10Y Treasury",
                  `${formatNumber(point.treasury_yield, 2)}%`,
                  palette.blue,
                )}${tooltipRow("Method", point.method === "forward" ? "Forward" : "Trailing proxy", palette.muted)}</div>`
              : ""
          }
        </div>`;
      },
    },
    xAxis: dateAxis(dates, palette),
    yAxis: valueAxis(palette, {
      min: indicator.id === "rsi" || indicator.id === "fear_greed" || indicator.id === "breadth_200dma" ? 0 : undefined,
      max: indicator.id === "rsi" || indicator.id === "fear_greed" || indicator.id === "breadth_200dma" ? 100 : undefined,
    }),
  };

  if (indicator.chart_kind === "ma200") {
    return {
      ...base,
      legend: {
        top: 0,
        right: 0,
        icon: "roundRect",
        itemWidth: 10,
        itemHeight: 2,
        textStyle: { color: palette.muted, fontSize: 10 },
        data: ["S&P 500", "200-day average"],
      },
      series: [
        {
          name: "S&P 500",
          type: "line",
          data: points.map((point) => point.price ?? null),
          showSymbol: false,
          smooth: 0.12,
          lineStyle: { color: palette.accent, width: 2 },
          areaStyle: { color: areaGradient(palette.accent, theme === "dark" ? 0.14 : 0.1) },
        },
        {
          name: "200-day average",
          type: "line",
          data: points.map((point) => point.ma200 ?? null),
          showSymbol: false,
          smooth: 0.12,
          lineStyle: { color: palette.blue, width: 1.5, type: "dashed" },
        },
      ],
    };
  }

  if (indicator.chart_kind === "relative") {
    return {
      ...base,
      legend: {
        top: 0,
        right: 0,
        icon: "roundRect",
        itemWidth: 10,
        itemHeight: 2,
        textStyle: { color: palette.muted, fontSize: 10 },
        data: ["RSP", "SPY"],
      },
      series: [
        {
          name: "RSP",
          type: "line",
          data: points.map((point) => point.rsp_norm ?? null),
          showSymbol: false,
          smooth: 0.12,
          lineStyle: { color: palette.teal, width: 2 },
        },
        {
          name: "SPY",
          type: "line",
          data: points.map((point) => point.spy_norm ?? null),
          showSymbol: false,
          smooth: 0.12,
          lineStyle: { color: palette.blue, width: 2 },
        },
      ],
    };
  }

  const thresholdLines = indicator.thresholds.map((threshold) => ({
    yAxis: threshold.value,
    lineStyle: { color: palette.muted, type: "dashed" as const, width: 1 },
    label: {
      show: true,
      position: "insideEndTop" as const,
      color: palette.muted,
      fontSize: 9,
      formatter: threshold.label,
    },
  }));

  return {
    ...base,
    series: [
      {
        name: indicator.short_name,
        type: "line",
        data: points.map((point) => point.value),
        showSymbol: false,
        smooth: indicator.id === "buffett" ? false : 0.18,
        lineStyle: { color: primaryColor, width: 2.1 },
        areaStyle: { color: areaGradient(primaryColor, theme === "dark" ? 0.2 : 0.14) },
        markLine: thresholdLines.length
          ? { silent: true, symbol: "none", data: thresholdLines }
          : undefined,
        emphasis: { focus: "series" },
      },
    ],
  };
}
