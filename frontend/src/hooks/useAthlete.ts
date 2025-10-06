import { useQuery } from "@tanstack/react-query";

import api from "../api/client";
import type { Athlete } from "../types/athlete";

const fetchAthlete = async (id: number): Promise<Athlete> => {
  const { data } = await api.get<Athlete>(`/athletes/${id}`);
  return data;
};

export const useAthlete = (id: number) =>
  useQuery({
    queryKey: ["athlete", id],
    queryFn: () => fetchAthlete(id),
    enabled: Number.isFinite(id),
  });
