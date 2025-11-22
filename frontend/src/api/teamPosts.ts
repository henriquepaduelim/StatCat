import api from "./client";
import type { TeamPost } from "../types/teamPost";

export type TeamPostQuery = {
  page?: number;
  size?: number;
};

export const getTeamPosts = async (teamId: number, params?: TeamPostQuery): Promise<TeamPost[]> => {
  const response = await api.get<TeamPost[]>(`/teams/${teamId}/posts`, { params });
  return response.data;
};

export const createTeamPost = async (teamId: number, formData: FormData): Promise<TeamPost> => {
  const response = await api.post<TeamPost>(`/teams/${teamId}/posts`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const exportTeamPostsArchive = async (
  options: { teamId?: number; deleteAfter?: boolean; includePosts?: boolean } = {},
): Promise<Blob> => {
  const params: Record<string, string | number | boolean> = {};
  if (typeof options.teamId === "number") {
    params.team_id = options.teamId;
  }
  if (typeof options.deleteAfter === "boolean") {
    params.delete_after = options.deleteAfter;
  }
  if (typeof options.includePosts === "boolean") {
    params.include_posts = options.includePosts;
  }
  const response = await api.post<Blob>("/team-posts/export", null, {
    params,
    responseType: "blob",
  });
  return response.data;
};
