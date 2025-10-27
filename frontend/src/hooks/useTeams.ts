import { useQuery } from "@tanstack/react-query";

import { listTeams, type Team } from "../api/teams";
import { useAuthStore } from "../stores/useAuthStore";

export const useTeams = (ageCategory?: string) => {
  const token = useAuthStore((state) => state.token);

  return useQuery<Team[]>({
    queryKey: ["teams", ageCategory ?? null],
    queryFn: () => listTeams(ageCategory),
    enabled: Boolean(token),
  });
};
