import { useQuery } from "@tanstack/react-query";

import api from "../api/client";
import { useAuthStore } from "../stores/useAuthStore";

export interface SessionRecord {
  id: number;
  client_id: number;
  athlete_id?: number | null;
  name: string;
  location?: string | null;
  scheduled_at?: string | null;
  notes?: string | null;
}

interface SessionFilters {
  clientId?: number;
  start?: string;
  end?: string;
}

const fetchSessions = async (filters: SessionFilters): Promise<SessionRecord[]> => {
  const params = new URLSearchParams();
  if (filters.clientId) {
    params.append("client_id", String(filters.clientId));
  }
  if (filters.start) {
    params.append("start", filters.start);
  }
  if (filters.end) {
    params.append("end", filters.end);
  }

  const { data } = await api.get<SessionRecord[]>("/sessions/", { params });
  return data;
};

export const useSessions = (filters: SessionFilters) => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["sessions", filters], // Query key includes all filters
    queryFn: () => fetchSessions(filters),
    staleTime: 1000 * 60,
    enabled: Boolean(token),
  });
};
