import { useQuery } from "@tanstack/react-query";

import { fetchAthleteMetrics, type AthleteMetricsResponse } from "../api/analytics";
import { useAuthStore } from "../stores/useAuthStore";

export const useAthleteMetrics = (athleteId: number, metricIds?: string[]) => {
  const token = useAuthStore((state) => state.token);

  return useQuery<AthleteMetricsResponse>({
    queryKey: ["athlete-metrics", athleteId, metricIds?.join("-") ?? "default"],
    queryFn: () => fetchAthleteMetrics(athleteId, metricIds),
    enabled: Boolean(token) && Number.isFinite(athleteId),
  });
};

