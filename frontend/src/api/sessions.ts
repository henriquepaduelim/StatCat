import api from "./client";
import type { SessionRecord } from "../hooks/useSessions";

export type CreateSessionPayload = {
  client_id?: number | null;
  name: string;
  location?: string;
  scheduled_at?: string;
  notes?: string;
};

export const createSession = async (payload: CreateSessionPayload): Promise<SessionRecord> => {
  const { data } = await api.post<SessionRecord>("/sessions", payload);
  return data;
};
