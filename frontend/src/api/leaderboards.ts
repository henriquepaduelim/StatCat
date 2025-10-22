import api from "./client";

export type LeaderboardType = "scorers" | "shootouts";

export interface LeaderboardEntry {
  athlete_id: number;
  full_name: string;
  team?: string | null;
  age_category?: string | null;
  position?: string | null;
  goals: number;
  shootout_goals: number;
}

export interface LeaderboardResponse {
  leaderboard_type: LeaderboardType;
  entries: LeaderboardEntry[];
}

export interface LeaderboardParams {
  leaderboard_type?: LeaderboardType;
  limit?: number;
  gender?: string;
  age_category?: string;
  client_id?: number;
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
