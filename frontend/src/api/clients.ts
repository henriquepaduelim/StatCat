import api from "./client";
import type { Client } from "../types/client";

export const fetchClients = async (): Promise<Client[]> => {
  const { data } = await api.get<Client[]>("/clients");
  return data;
};
