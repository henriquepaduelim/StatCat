import api from "./client";

export interface MetricComponent {
  label: string;
  value: number | null;
  unit?: string | null;
  extra?: Record<string, unknown> | null;
}

export interface MetricScore {
  id: string;
  name: string;
  category: string;
  description: string;
  direction: "higher_is_better" | "lower_is_better" | "mixed";
  value: number | null;
  unit?: string | null;
  components: MetricComponent[];
  tags: string[];
}

export interface AthleteMetricsResponse {
  athlete_id: number;
  metrics: MetricScore[];
}

export interface RankingEntry {
  athlete_id: number;
  full_name: string;
  value: number;
  unit?: string | null;
  team?: string | null;
  age?: number | null;
  gender?: string | null;
}

export interface MetricRankingResponse {
  metric: MetricScore;
  entries: RankingEntry[];
}

export interface MetricRankingParams {
  limit?: number;
  gender?: string;
  age_category?: string;
  client_id?: number;
}

export const fetchAthleteMetrics = async (
  athleteId: number,
  metrics?: string[]
) => {
  const params = metrics?.length ? { metric: metrics } : undefined;
  const { data } = await api.get<AthleteMetricsResponse>(
    `/analytics/athletes/${athleteId}/metrics`,
    { params }
  );
  return data;
};

export const fetchMetricRanking = async (
  metricId: string,
  params: MetricRankingParams
) => {
  const { data } = await api.get<MetricRankingResponse>(
    `/analytics/rankings/metrics/${metricId}`,
    { params }
  );
  return data;
};

