import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../stores/useAuthStore";
import { usePermissions } from "./usePermissions";
import api from "../api/client";

interface PendingAthletesCount {
  count: number;
}

const fetchPendingAthletesCount = async (): Promise<PendingAthletesCount> => {
  const { data } = await api.get<PendingAthletesCount>("/athletes/pending/count");
  return data;
};

export const usePendingAthletesCount = () => {
  const token = useAuthStore((state) => state.token);
  const permissions = usePermissions();

  return useQuery({
    queryKey: ["pending-athletes-count"],
    queryFn: fetchPendingAthletesCount,
    staleTime: 1000 * 30, // 30 seconds
    enabled: Boolean(token) && permissions.canViewAthletes,
    refetchInterval: 1000 * 60, // Refetch every minute
    retry: 1, // Only retry once
    retryOnMount: false, // Don't retry on mount
  });
};
