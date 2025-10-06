import { useQuery } from "@tanstack/react-query";

import { fetchClients } from "../api/clients";
import type { Client } from "../types/client";

export const useClients = () =>
  useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: fetchClients,
    staleTime: 1000 * 60 * 5,
  });
