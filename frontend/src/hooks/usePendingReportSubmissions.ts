import { useQuery } from "@tanstack/react-query";

import { fetchPendingReportSubmissions } from "../api/reportSubmissions";
import { useAuthStore } from "../stores/useAuthStore";

export const usePendingReportSubmissions = (options?: { enabled?: boolean }) => {
  const token = useAuthStore((state) => state.token);
  const enabled = (options?.enabled ?? true) && Boolean(token);
  return useQuery({
    queryKey: ["report-submissions", "pending"],
    queryFn: fetchPendingReportSubmissions,
    enabled,
  });
};
