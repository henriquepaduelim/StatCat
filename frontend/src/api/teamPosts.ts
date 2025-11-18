import api from "./client";
import type { TeamPost } from "../types/teamPost";

export const getTeamPosts = async (teamId: number): Promise<TeamPost[]> => {
  const response = await api.get<TeamPost[]>(`/teams/${teamId}/posts`);
  return response.data;
};

export const createTeamPost = async (teamId: number, formData: FormData): Promise<TeamPost> => {
  const response = await api.post<TeamPost>(`/teams/${teamId}/posts`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};
