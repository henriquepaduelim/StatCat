import { useQuery } from "@tanstack/react-query";

import { listAthleteCombineMetrics, type TeamCombineMetric } from "../api/teamMetrics";
import { useAuthStore } from "../stores/useAuthStore";

export const useAthleteCombineMetrics = (athleteId?: number, options?: { enabled?: boolean }) => {
  const token = useAuthStore((state) => state.token);

  return useQuery<TeamCombineMetric[]>({
    queryKey: ["athlete-combine-metrics", athleteId],
    queryFn: () => listAthleteCombineMetrics(athleteId as number),
    enabled: Boolean(token && athleteId) && (options?.enabled ?? true),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};
