import api from "./client";

export interface TeamCombineMetric {
  id: number;
  team_id: number;
  athlete_id: number | null;
  sitting_height_cm: number | null;
  standing_height_cm: number | null;
  weight_kg: number | null;
  split_10m_s: number | null;
  split_20m_s: number | null;
  split_35m_s: number | null;
  yoyo_distance_m: number | null;
  jump_cm: number | null;
  max_power_kmh: number | null;
  recorded_at: string;
  recorded_by_id: number;
}

export type TeamCombineMetricPayload = {
  athlete_id?: number | null;
  sitting_height_cm?: number | null;
  standing_height_cm?: number | null;
  weight_kg?: number | null;
  split_10m_s?: number | null;
  split_20m_s?: number | null;
  split_35m_s?: number | null;
  yoyo_distance_m?: number | null;
  jump_cm?: number | null;
  max_power_kmh?: number | null;
  recorded_at?: string | null;
};

export const listTeamCombineMetrics = async (
  teamId: number,
  options: { limit?: number } = {},
) => {
  const params: Record<string, number> = {};
  if (options.limit) {
    params.limit = options.limit;
  }
  const { data } = await api.get<TeamCombineMetric[]>(`/teams/${teamId}/combine-metrics`, {
    params,
  });
  return data;
};

export const createTeamCombineMetric = async (
  teamId: number,
  payload: TeamCombineMetricPayload,
) => {
  const { data } = await api.post<TeamCombineMetric>(`/teams/${teamId}/combine-metrics`, payload);
  return data;
};
