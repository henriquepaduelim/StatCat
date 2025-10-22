import api from "./client";

export interface Group {
  id: number;
  client_id: number;
  name: string;
  description?: string | null;
  created_by_id: number;
  created_at: string;
  updated_at: string;
  member_ids: number[];
}

export const listGroups = async (clientId?: number) => {
  const params = clientId ? { client_id: clientId } : undefined;
  const { data } = await api.get<Group[]>("/groups/", { params });
  return data;
};

