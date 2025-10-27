import { useQuery } from "@tanstack/react-query";

import { listTeamCoaches } from "../api/teams";
import { useAuthStore } from "../stores/useAuthStore";

export const useTeamCoaches = (teamId?: number | null) => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["team-coaches", teamId ?? null],
    queryFn: () => listTeamCoaches(teamId as number),
    enabled: Boolean(token && teamId),
    staleTime: 1000 * 30,
  });
};
