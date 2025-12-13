import { useQuery } from "@tanstack/react-query";

import api from "../api/client";
import { useAuthStore } from "../stores/useAuthStore";
import type { PaginatedResponse } from "../types/pagination";

export interface SessionRecord {
  id: number;
  athlete_id?: number | null;
  name: string;
  location?: string | null;
  scheduled_at?: string | null;
  notes?: string | null;
}

export interface SessionFilters {
  start?: string;
  end?: string;
}

const defaultFilters: SessionFilters = {};

const fetchSessions = async (
  filters: SessionFilters = defaultFilters,
): Promise<SessionRecord[]> => {
  const params = new URLSearchParams();
  if (filters.start) {
    params.append("start", filters.start);
  }
  if (filters.end) {
    params.append("end", filters.end);
  }

  const { data } = await api.get<PaginatedResponse<SessionRecord>>("/sessions/", { params });
  return data.items ?? [];
};

export const useSessions = (filters: SessionFilters = defaultFilters) => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["sessions", filters], // Query key includes all filters
    queryFn: () => fetchSessions(filters),
    staleTime: 1000 * 60,
    enabled: Boolean(token),
  });
};
