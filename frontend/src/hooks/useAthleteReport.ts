import { useQuery } from "@tanstack/react-query";

import api from "../api/client";
import type { AthleteReport } from "../types/athlete";
import { useAuthStore } from "../stores/useAuthStore";

const fetchAthleteReport = async (athleteId: number): Promise<AthleteReport> => {
  const { data } = await api.get<AthleteReport>(`/reports/athletes/${athleteId}`);
  return data;
};

export const useAthleteReport = (athleteId?: number) => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["athlete-report", athleteId],
    queryFn: () => fetchAthleteReport(athleteId as number),
    enabled: Boolean(token) && Boolean(athleteId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
