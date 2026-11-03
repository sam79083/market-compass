import type { ThemeMode } from "./types";

export interface ChartPalette {
  text: string;
  muted: string;
  faint: string;
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipShadow: string;
  accent: string;
  teal: string;
  red: string;
  amber: string;
  blue: string;
  violet: string;
  panel: string;
}

export const chartPalettes: Record<ThemeMode, ChartPalette> = {
  dark: {
    text: "#dbe4ec",
    muted: "#8b9aa8",
    faint: "rgba(219, 228, 236, 0.45)",
    grid: "rgba(255, 255, 255, 0.055)",
    axis: "rgba(255, 255, 255, 0.13)",
    tooltipBg: "#0e161e",
    tooltipBorder: "rgba(255, 255, 255, 0.12)",
    tooltipShadow: "rgba(0, 0, 0, 0.45)",
    accent: "#d8b26a",
    teal: "#6fcfb2",
    red: "#e06c75",
    amber: "#e39a5c",
    blue: "#7aa2f7",
    violet: "#c792ea",
    panel: "#101820",
  },
  light: {
    text: "#24313b",
    muted: "#6b7a86",
    faint: "rgba(36, 49, 59, 0.5)",
    grid: "rgba(36, 49, 59, 0.07)",
    axis: "rgba(36, 49, 59, 0.16)",
    tooltipBg: "#fffdf8",
    tooltipBorder: "rgba(36, 49, 59, 0.14)",
    tooltipShadow: "rgba(54, 43, 26, 0.16)",
    accent: "#9a6b2f",
    teal: "#2f8f72",
    red: "#c14d58",
    amber: "#b96f2e",
    blue: "#3f6fb5",
    violet: "#8b5ba8",
    panel: "#fffdf8",
  },
};
