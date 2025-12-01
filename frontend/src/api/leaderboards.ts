import api from "./client";

export type LeaderboardType = "scorers" | "clean_sheets";

export interface LeaderboardEntry {
  athlete_id: number;
  full_name: string;
  photo_url?: string | null;
  team?: string | null;
  age_category?: string | null;
  position?: string | null;
  goals: number;
  clean_sheets: number;
  games_played: number;
  goals_conceded: number;
}

export interface LeaderboardResponse {
  leaderboard_type: LeaderboardType;
  entries: LeaderboardEntry[];
}

export type CombineMetricId =
  | "split_10m_s"
  | "split_20m_s"
  | "split_35m_s"
  | "jump_cm"
  | "max_power_kmh"
  | "yoyo_distance_m";

export type CombineLeaderboardDirection = "higher_is_better" | "lower_is_better";

export interface CombineLeaderboardEntry {
  athlete_id: number;
  full_name: string;
  photo_url?: string | null;
  team?: string | null;
  age_category?: string | null;
  value: number | null;
  unit?: string | null;
}

export interface CombineLeaderboardResponse {
  metric: CombineMetricId;
  direction: CombineLeaderboardDirection;
  unit?: string | null;
  entries: CombineLeaderboardEntry[];
}

export interface LeaderboardParams {
  leaderboard_type?: LeaderboardType;
  limit?: number;
  gender?: string;
  age_category?: string;
  team_id?: number;
}

export const fetchScoringLeaderboard = async (params: LeaderboardParams) => {
  const sanitizedParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null)
  ) as Record<string, unknown>;
  const { data } = await api.get<LeaderboardResponse>("/analytics/leaderboards/scoring", {
    params: sanitizedParams,
  });
  return data;
};

export interface CombineLeaderboardParams {
  metric: CombineMetricId;
  team_id?: number;
  limit?: number;
}

export const fetchCombineLeaderboard = async (params: CombineLeaderboardParams) => {
  const sanitizedParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null)
  ) as Record<string, unknown>;
  const { data } = await api.get<CombineLeaderboardResponse>("/analytics/leaderboards/combine", {
    params: sanitizedParams,
  });
  return data;
};
