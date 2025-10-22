import { useQuery } from "@tanstack/react-query";

import {
  fetchScoringLeaderboard,
  type LeaderboardParams,
  type LeaderboardResponse,
} from "../api/leaderboards";
import { useAuthStore } from "../stores/useAuthStore";

export const useScoringLeaderboard = (params: LeaderboardParams) => {
  const token = useAuthStore((state) => state.token);

  return useQuery<LeaderboardResponse>({
    queryKey: [
      "scoring-leaderboard",
      params.leaderboard_type ?? "scorers",
      params.limit ?? null,
      params.gender ?? null,
      params.age_category ?? null,
      params.client_id ?? null,
    ],
    queryFn: () => fetchScoringLeaderboard(params),
    enabled: Boolean(token),
  });
};
