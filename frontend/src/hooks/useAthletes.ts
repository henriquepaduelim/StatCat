import { useQuery } from "@tanstack/react-query";

import api from "../api/client";
import type { Athlete } from "../types/athlete";
import { useAuthStore } from "../stores/useAuthStore";

const fetchAthletes = async (clientId?: number): Promise<Athlete[]> => {
  const { data } = await api.get<Athlete[]>("/athletes", {
    params: clientId ? { client_id: clientId } : undefined,
  });
  return data;
};

export const useAthletes = (clientId?: number) => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["athletes", clientId ?? "all"],
    queryFn: () => fetchAthletes(clientId),
    staleTime: 1000 * 60,
    enabled: Boolean(token),
  });
};
