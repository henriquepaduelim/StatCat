import { useQuery } from "@tanstack/react-query";

import api from "../api/client";

export interface SessionRecord {
  id: number;
  client_id: number;
  name: string;
  location?: string | null;
  scheduled_at?: string | null;
  notes?: string | null;
}

const fetchSessions = async (clientId?: number): Promise<SessionRecord[]> => {
  const { data } = await api.get<SessionRecord[]>("/sessions", {
    params: clientId ? { client_id: clientId } : undefined,
  });
  return data;
};

export const useSessions = (clientId?: number) =>
  useQuery({
    queryKey: ["sessions", clientId ?? "all"],
    queryFn: () => fetchSessions(clientId),
    staleTime: 1000 * 60,
  });
