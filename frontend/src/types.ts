export type RangeKey = "1y" | "3y" | "5y" | "10y" | "max";

export type ThemeMode = "dark" | "light";

export interface Band {
  key: string;
  label: string;
  min: number;
  max: number;
  color: string;
}

export interface IndicatorPoint {
  date: string;
  effective_date: string;
  value: number;
  display: string;
  is_estimate: boolean;
  source: string;
  meta: Record<string, unknown>;
  price?: number | null;
  ma200?: number | null;
  ma200_slope_20d?: number | null;
  rsp_norm?: number | null;
  spy_norm?: number | null;
  rel_252d?: number | null;
  earnings_yield?: number | null;
  treasury_yield?: number | null;
  method?: string | null;
  above?: number | null;
  constituents?: number | null;
  scored_comparison?: IndicatorPoint | null;
}

export interface ScorePayload {
  score_date: string;
  score: number | null;
  percentile: number | null;
  raw_value: number | null;
  window_years_used: number | null;
  observations_used: number | null;
  effective_date: string | null;
  quality: string;
  meta: Record<string, unknown>;
  current: boolean;
}

export interface Threshold {
  value: number;
  label: string;
}

export interface Indicator {
  id: string;
  name: string;
  short_name: string;
  description: string;
  section: string;
  section_label: string;
  category: string;
  category_label: string;
  unit: string;
  value_kind: string;
  frequency: string;
  source_name: string;
  source_url: string;
  methodology: string;
  limitations: string;
  order: number;
  weight: number;
  supplementary: boolean;
  optional: boolean;
  unavailable_reason: string | null;
  chart_kind: "line" | "ma200" | "relative";
  thresholds: Threshold[];
  status: string;
  status_message: string;
  last_run_status: string;
  pending_estimate: boolean;
  latest: IndicatorPoint | null;
  scored: IndicatorPoint | null;
  score: ScorePayload | null;
}

export interface ComponentView {
  id: string;
  name: string;
  short_name: string;
  category: string;
  weight: number;
  available: boolean;
  supplementary: boolean;
  score: number | null;
  percentile: number | null;
  raw_value: number | null;
  effective_date: string | null;
  window_years_used: number | null;
  observations_used: number | null;
  quality: string;
}

export interface Category {
  key: string;
  label: string;
  description: string;
  weight: number;
  score: number | null;
  coverage: number;
  classification: string;
  classification_key: string;
  color: string;
  components: Record<string, ComponentView>;
}

export interface SummaryScore {
  score: number | null;
  label: string;
  coverage: number;
  color: string;
}

export interface Overall extends SummaryScore {
  classification: string;
  classification_key: string;
  confidence: string;
  quality_flags: string[];
  long_term: SummaryScore;
  conditions: SummaryScore;
}

export interface SentimentSummary {
  available: boolean;
  is_proxy: boolean;
  value: number | null;
  label: string;
  source: string;
  note: string;
}

export interface TrendSummary {
  available: boolean;
  label: string;
  price: number | null;
  ma200: number | null;
  deviation_pct: number | null;
  slope_20d_pct?: number | null;
}

export interface Factor {
  id: string;
  name: string;
  short_name: string;
  score: number;
  percentile: number | null;
  role: string;
  text: string;
}

export interface Explanation {
  headline: string;
  body: string;
  supporting_label: string;
  contradicting_label: string;
  supporting: Factor[];
  contradicting: Factor[];
  conflicts: string[];
  data_notes: string[];
  disclaimer: string;
  long_term?: SummaryScore | null;
  conditions?: SummaryScore | null;
  quality_flags?: string[];
}

export interface Freshness {
  total: number;
  available: number;
  fresh: number;
  stored: number;
  degraded: number;
  stale: number;
  unscored: number;
  unavailable: number;
  coverage: number;
  confidence: string;
  as_of: string | null;
  latest_data: string | null;
  last_refresh: string | null;
  last_run_status: string;
  last_run_message: string;
}

export interface LastRun {
  id: number;
  status: string;
  message: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface Dashboard {
  generated_at: string;
  has_data: boolean;
  as_of: string | null;
  latest_data: string | null;
  overall: Overall;
  categories: Category[];
  sentiment: SentimentSummary;
  trend: TrendSummary;
  explanation: Explanation;
  freshness: Freshness;
  indicators: Indicator[];
  bands: Band[];
  weights: Record<string, unknown>;
  weights_hash: string;
  disclaimer: string;
  last_run: LastRun | null;
}

export interface CompositeComponent {
  score: number | null;
  percentile: number | null;
  available: boolean;
  weight: number;
}

export interface CompositePoint {
  date: string;
  score: number;
  classification: string;
  coverage: number;
  confidence: string;
  components: Record<string, CompositeComponent>;
  categories: Record<string, { score: number | null; coverage: number }>;
}

export interface CompositeHistory {
  range: string;
  available_from: string | null;
  available_to: string | null;
  reference_line: number;
  bands: Band[];
  weights_hash: string;
  points: CompositePoint[];
}

export interface HistoryIndicator {
  id: string;
  name: string;
  short_name: string;
  description: string;
  unit: string;
  value_kind: string;
  frequency: string;
  source_name: string;
  source_url: string;
  methodology: string;
  limitations: string;
  chart_kind: "line" | "ma200" | "relative";
  thresholds: Threshold[];
  optional: boolean;
}

export interface IndicatorHistory {
  indicator: HistoryIndicator;
  range: string;
  available_from: string | null;
  available_to: string | null;
  points: IndicatorPoint[];
}

export interface ReturnStats {
  n: number;
  mean: number | null;
  median: number | null;
  positive_rate: number | null;
  spearman: number | null;
}

export interface ClassificationReturn {
  classification: string;
  n: number;
  mean_price_return: number;
  median_price_return: number;
  positive_rate: number;
}

export interface HorizonPayload {
  composite: Record<string, ReturnStats>;
  cape: Record<string, ReturnStats>;
  forward_pe: Record<string, ReturnStats>;
  by_classification: ClassificationReturn[];
}

export interface WindowResult {
  score: number | null;
  coverage: number;
  classification: string;
  categories: Record<string, { score: number | null; coverage: number }>;
}

export interface ValidationPayload {
  generated_at: string;
  weights_hash: string;
  start: string | null;
  end: string | null;
  n_scores: number;
  horizons: Record<string, HorizonPayload>;
  out_of_sample: Record<string, Record<string, HorizonPayload>>;
  correlations: {
    n: number;
    pearson: Record<string, Record<string, number | null>>;
    spearman: Record<string, Record<string, number | null>>;
  };
  window_sensitivity: {
    latest_date: string;
    windows: Record<string, WindowResult>;
  };
  limitations: string[];
}

export interface DataSource {
  id: string;
  name: string;
  url: string;
  used_for: string[];
  frequency: string;
  limitations: string;
}

export interface MethodologyIndicator {
  id: string;
  name: string;
  short_name: string;
  description: string;
  section: string;
  category: string;
  unit: string;
  frequency: string;
  source_name: string;
  source_url: string;
  methodology: string;
  limitations: string;
  weight: number;
  supplementary: boolean;
  optional: boolean;
  unavailable_reason: string | null;
  transform: string;
  window_years: number;
  minimum_observations: number;
  staleness_days: number;
  availability_lag_days: number;
}

export interface Methodology {
  generated_at: string;
  weights: {
    version: string;
    overall: Record<string, number>;
    fundamental: Record<string, number>;
    relative: Record<string, number>;
    sentiment: Record<string, number>;
    breadth: Record<string, number>;
    minimum_coverage: number;
    minimum_categories: number;
    [key: string]: unknown;
  };
  weights_hash: string;
  score_method: string;
  categories: Array<{ key: string; label: string; description: string; weight: number }>;
  bands: Band[];
  indicators: MethodologyIndicator[];
  sources: DataSource[];
  quality_notes: Record<string, string>;
  validation: ValidationPayload | null;
  disclaimer: string;
}
