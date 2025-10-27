import { useQuery } from "@tanstack/react-query";

import api from "../api/client";
import type { Athlete } from "../types/athlete";
import { useAuthStore } from "../stores/useAuthStore";

export type AthleteFilters = {
  gender?: Athlete["gender"];
  team_id?: number | null;
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

const fetchAthletes = async (filters?: AthleteFilters): Promise<Athlete[]> => {
  const params = sanitizeFilters(filters);
  const { data } = await api.get<Athlete[]>("/athletes/", { params });
  return data;
};

export const useAthletes = (filters?: AthleteFilters) => {
  const token = useAuthStore((state) => state.token);
  const params = sanitizeFilters(filters);

  return useQuery({
    queryKey: ["athletes", params ?? null],
    queryFn: () => fetchAthletes(params),
    staleTime: 1000 * 60,
    enabled: Boolean(token),
  });
};
