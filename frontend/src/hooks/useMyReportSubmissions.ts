import { useQuery } from "@tanstack/react-query";

import { fetchMyReportSubmissions } from "../api/reportSubmissions";
import { useAuthStore } from "../stores/useAuthStore";

export const useMyReportSubmissions = (options?: { enabled?: boolean }) => {
  const token = useAuthStore((state) => state.token);
  const enabled = (options?.enabled ?? true) && Boolean(token);
  return useQuery({
    queryKey: ["report-submissions", "mine"],
    queryFn: fetchMyReportSubmissions,
    enabled,
  });
};
