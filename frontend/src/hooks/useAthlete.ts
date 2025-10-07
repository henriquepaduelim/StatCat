import { useQuery } from "@tanstack/react-query";

import api from "../api/client";
import type { Athlete } from "../types/athlete";
import { useAuthStore } from "../stores/useAuthStore";

const fetchAthlete = async (id: number): Promise<Athlete> => {
  const { data } = await api.get<Athlete>(`/athletes/${id}`);
  return data;
};

export const useAthlete = (id: number) => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["athlete", id],
    queryFn: () => fetchAthlete(id),
    enabled: Boolean(token) && Number.isFinite(id),
  });
};
