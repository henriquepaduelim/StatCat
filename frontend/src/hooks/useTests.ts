import { useQuery } from "@tanstack/react-query";

import api from "../api/client";
import type { TestDefinition } from "../types/test";
import { useAuthStore } from "../stores/useAuthStore";

const fetchTests = async (): Promise<TestDefinition[]> => {
  const { data } = await api.get<TestDefinition[]>("/tests/");
  return data;
};

export const useTests = () => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["tests"],
    queryFn: () => fetchTests(),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(token),
  });
};
