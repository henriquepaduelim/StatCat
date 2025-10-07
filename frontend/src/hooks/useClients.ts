import { useQuery } from "@tanstack/react-query";

import { fetchClients } from "../api/clients";
import type { Client } from "../types/client";
import { useAuthStore } from "../stores/useAuthStore";

export const useClients = () => {
  const token = useAuthStore((state) => state.token);

  return useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: fetchClients,
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(token),
  });
};
