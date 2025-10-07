import api from "./client";
import type { TestDefinition } from "../types/test";

export type CreateTestPayload = {
  client_id?: number | null;
  name: string;
  category?: string;
  unit?: string;
  description?: string;
  target_direction: "higher" | "lower";
};

export const createTest = async (payload: CreateTestPayload): Promise<TestDefinition> => {
  const { data } = await api.post<TestDefinition>("/tests", payload);
  return data;
};
