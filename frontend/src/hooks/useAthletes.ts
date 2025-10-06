import { useQuery } from "@tanstack/react-query";

import api from "../api/client";
import type { Athlete } from "../types/athlete";

const fetchAthletes = async (): Promise<Athlete[]> => {
  const { data } = await api.get<Athlete[]>("/athletes");
  return data;
};

export const useAthletes = () =>
  useQuery({
    queryKey: ["athletes"],
    queryFn: fetchAthletes,
    staleTime: 1000 * 30,
  });
