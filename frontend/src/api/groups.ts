import api from "./client";
import type { PaginatedResponse } from "../types/pagination";

export interface Group {
  id: number;
  name: string;
  description?: string | null;
  created_by_id: number;
  created_at: string;
  updated_at: string;
  member_ids: number[];
}

export const listGroups = async () => {
  const { data } = await api.get<PaginatedResponse<Group>>("/groups/");
  return data.items ?? [];
};
