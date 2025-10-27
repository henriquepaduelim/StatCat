import api from "./client";

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
  const { data } = await api.get<Group[]>("/groups/");
  return data;
};
