import { useQuery } from "@tanstack/react-query";

import { listGroups, type Group } from "../api/groups";

export const useGroups = (clientId?: number) => {
  return useQuery({
    queryKey: ["groups", clientId],
    queryFn: () => listGroups(clientId),
    staleTime: 1000 * 60,
  });
};

export type { Group };

