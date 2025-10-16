import api from "./client";
import type { SessionRecord } from "../hooks/useSessions";

export interface SessionResultRecord {
  id: number;
  session_id: number;
  athlete_id: number;
  test_id: number;
  value: number;
  unit?: string | null;
  recorded_at: string;
  notes?: string | null;
}

export type CreateSessionPayload = {
  client_id?: number | null;
  name: string;
  location?: string;
  scheduled_at?: string;
  notes?: string;
};

export const createSession = async (payload: CreateSessionPayload): Promise<SessionRecord> => {
  const { data } = await api.post<SessionRecord>("/sessions/", payload);
  return data;
};

export type SessionResultPayload = {
  athlete_id: number;
  test_id: number;
  value: number;
  unit?: string;
  recorded_at?: string;
  notes?: string;
};

export const addSessionResults = async (
  sessionId: number,
  payload: SessionResultPayload[]
): Promise<SessionResultRecord[]> => {
  const { data } = await api.post<SessionResultRecord[]>(
    `/sessions/${sessionId}/results`,
    payload
  );
  return data;
};
