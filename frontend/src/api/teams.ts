import api from "./client";

export interface Team {
  id: number;
  client_id: number;
  name: string;
  age_category: string;
  description?: string | null;
  coach_name?: string | null;
  created_by_id?: number | null;
  created_at: string;
  updated_at: string;
  athlete_count: number;
}

export interface ListTeamsParams {
  client_id?: number;
  age_category?: string;
}

export const listTeams = async (params?: ListTeamsParams) => {
  const { data } = await api.get<Team[]>("/teams/", { params });
  return data;
};
