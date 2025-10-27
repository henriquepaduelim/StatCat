import { useQuery } from "@tanstack/react-query";

import {
  fetchMetricRanking,
  type MetricRankingParams,
  type MetricRankingResponse,
} from "../api/analytics";
import { useAuthStore } from "../stores/useAuthStore";

export const useMetricRanking = (metricId: string, params: MetricRankingParams) => {
  const token = useAuthStore((state) => state.token);

  return useQuery<MetricRankingResponse>({
    queryKey: [
      "metric-ranking",
      metricId,
      params.limit ?? null,
      params.gender ?? null,
      params.age_category ?? null,
    ],
    queryFn: () => fetchMetricRanking(metricId, params),
    enabled: Boolean(token) && Boolean(metricId),
  });
};
