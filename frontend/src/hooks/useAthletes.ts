import { useInfiniteQuery } from "@tanstack/react-query";

import api from "../api/client";
import type { Athlete } from "../types/athlete";
import type { PaginatedResponse } from "../types/pagination";
import { useAuthStore } from "../stores/useAuthStore";
import { usePermissions } from "./usePermissions";

export type AthleteFilters = {
  gender?: Athlete["gender"];
  team_id?: number | null;
  include_user_status?: boolean;
  page?: number;
  size?: number;
};

const sanitizeFilters = (filters?: AthleteFilters) => {
  if (!filters) {
    return undefined;
  }
  const entries = Object.entries(filters).filter(([, value]) => {
    if (value === undefined || value === null) {
      return false;
    }
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    return true;
  });
  if (!entries.length) {
    return undefined;
  }
  return Object.fromEntries(entries) as AthleteFilters;
};

const fetchAthletes = async (
  filters?: AthleteFilters,
): Promise<PaginatedResponse<Athlete>> => {
  const params = sanitizeFilters(filters);
  const { data } = await api.get<PaginatedResponse<Athlete>>("/athletes/", {
    params,
  });
  return data;
};

export const useAthletes = (filters?: Omit<AthleteFilters, "page" | "size">) => {
  const token = useAuthStore((state) => state.token);
  const permissions = usePermissions();

  const enhancedFilters = {
    ...filters,
    include_user_status: permissions.canCreateAthletes,
  };

  const params = sanitizeFilters(enhancedFilters);

  return useInfiniteQuery({
    queryKey: ["athletes", params ?? null],
    queryFn: ({ pageParam = 1 }) =>
      fetchAthletes({ ...params, page: pageParam, size: 50 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.items.length > 0) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: Boolean(token),
  });
};
