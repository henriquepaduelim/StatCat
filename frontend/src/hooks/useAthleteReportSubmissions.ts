import { useQuery } from "@tanstack/react-query";

import { fetchAthleteReportSubmissions } from "../api/reportSubmissions";

export const useAthleteReportSubmissions = (athleteId?: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["report-submissions", "athlete", athleteId],
    queryFn: () => fetchAthleteReportSubmissions(athleteId as number),
    enabled: enabled && typeof athleteId === "number",
  });
};
