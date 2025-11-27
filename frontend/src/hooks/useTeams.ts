import { useQuery } from "@tanstack/react-query";

import { listTeams } from "../api/teams";
import type { Team } from "../types/team";
import { useAuthStore } from "../stores/useAuthStore";

export const useTeams = (ageCategory?: string) => {
  const token = useAuthStore((state) => state.token);

  return useQuery<Team[]>({
    queryKey: ["teams", ageCategory ?? null],
    queryFn: () => listTeams(ageCategory),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
