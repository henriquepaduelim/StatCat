import { useQuery } from "@tanstack/react-query";

import { fetchApprovedReportSubmissions } from "../api/reportSubmissions";
import { useAuthStore } from "../stores/useAuthStore";

export const useApprovedReportSubmissions = (options?: { enabled?: boolean }) => {
  const token = useAuthStore((state) => state.token);
  const enabled = (options?.enabled ?? true) && Boolean(token);
  return useQuery({
    queryKey: ["report-submissions", "approved"],
    queryFn: fetchApprovedReportSubmissions,
    enabled,
  });
};
