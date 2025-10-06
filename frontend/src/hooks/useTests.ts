import { useQuery } from "@tanstack/react-query";

import api from "../api/client";
import type { TestDefinition } from "../types/test";

const fetchTests = async (clientId?: number): Promise<TestDefinition[]> => {
  const { data } = await api.get<TestDefinition[]>("/tests", {
    params: clientId ? { client_id: clientId } : undefined,
  });
  return data;
};

export const useTests = (clientId?: number) =>
  useQuery({
    queryKey: ["tests", clientId ?? "all"],
    queryFn: () => fetchTests(clientId),
    staleTime: 1000 * 60 * 5,
  });
