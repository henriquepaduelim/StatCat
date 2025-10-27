import { useQuery } from "@tanstack/react-query";

import { listGroups, type Group } from "../api/groups";

export const useGroups = () => {
  return useQuery({
    queryKey: ["groups"],
    queryFn: () => listGroups(),
    staleTime: 1000 * 60,
  });
};

export type { Group };
