import { useQuery } from "@tanstack/react-query";

import {
  fetchCombineLeaderboard,
  type CombineLeaderboardParams,
  type CombineLeaderboardResponse,
} from "../api/leaderboards";
import { useAuthStore } from "../stores/useAuthStore";

export const useCombineLeaderboard = (params: CombineLeaderboardParams) => {
  const token = useAuthStore((state) => state.token);

  return useQuery<CombineLeaderboardResponse>({
    queryKey: ["combine-leaderboard", params.metric, params.limit ?? null, params.team_id ?? null],
    queryFn: () => fetchCombineLeaderboard(params),
    enabled: Boolean(token && params.metric),
  });
};
