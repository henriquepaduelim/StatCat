import { useQuery } from "@tanstack/react-query";

import { listTeams, type Team } from "../api/teams";
import { useAuthStore } from "../stores/useAuthStore";

export const useTeams = (clientId?: number, ageCategory?: string) => {
  const token = useAuthStore((state) => state.token);

  return useQuery<Team[]>({
    queryKey: ["teams", clientId ?? null, ageCategory ?? null],
    queryFn: () => listTeams({ client_id: clientId, age_category: ageCategory }),
    enabled: Boolean(token) && Boolean(clientId),
  });
};
