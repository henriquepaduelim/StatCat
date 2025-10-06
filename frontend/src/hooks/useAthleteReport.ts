import { useQuery } from "@tanstack/react-query";

import api from "../api/client";
import type { AthleteReport } from "../types/athlete";

const fetchAthleteReport = async (athleteId: number): Promise<AthleteReport> => {
  const { data } = await api.get<AthleteReport>(`/reports/athletes/${athleteId}`);
  return data;
};

export const useAthleteReport = (athleteId?: number) =>
  useQuery({
    queryKey: ["athlete-report", athleteId],
    queryFn: () => fetchAthleteReport(athleteId as number),
    enabled: Boolean(athleteId),
    staleTime: 1000 * 60,
  });
