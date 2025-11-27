import api from "./client";
import type { Team } from "../types/team";

export const listTeams = async (ageCategory?: string) => {
  const params = ageCategory ? { age_category: ageCategory } : undefined;
  const { data } = await api.get<Team[]>("/teams/", { params });
  return data;
};

export interface TeamPayload {
  name: string;
  age_category: string;
  description?: string | null;
  coach_name?: string | null;
}

export const createTeam = async (payload: TeamPayload) => {
  const { data } = await api.post<Team>("/teams/", payload);
  return data;
};

export const updateTeam = async (teamId: number, payload: TeamPayload) => {
  const { data } = await api.put<Team>(`/teams/${teamId}`, payload);
  return data;
};

export const deleteTeam = async (teamId: number) => {
  await api.delete(`/teams/${teamId}`);
};

export interface TeamCoach {
  id: number;
  email: string;
  full_name: string;
  phone?: string | null;
  role: string;
  athlete_id?: number | null;
  is_active: boolean;
}

export interface TeamCoachPayload {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
}

export const listTeamCoaches = async (teamId: number) => {
  const { data } = await api.get<TeamCoach[]>(`/teams/${teamId}/coaches`);
  return data;
};

export const createTeamCoach = async (teamId: number, payload: TeamCoachPayload) => {
  const { data } = await api.post<TeamCoach>(`/teams/${teamId}/coaches`, payload);
  return data;
};

export const deleteTeamCoach = async (teamId: number, coachId: number) => {
  await api.delete(`/teams/${teamId}/coaches/${coachId}`);
};

export const listAllCoaches = async () => {
  const { data } = await api.get<TeamCoach[]>("/teams/coaches");
  return data;
};

export const createCoach = async (payload: TeamCoachPayload) => {
  const { data } = await api.post<TeamCoach>("/teams/coaches", payload);
  return data;
};

export const assignCoachToTeam = async (teamId: number, coachId: number) => {
  const { data } = await api.post<TeamCoach>(`/teams/${teamId}/coaches/${coachId}/assign`);
  return data;
};

export const updateCoach = async (coachId: number, payload: TeamCoachPayload) => {
  const { data } = await api.put<TeamCoach>(`/teams/coaches/${coachId}`, payload);
  return data;
};

export const deleteCoach = async (coachId: number) => {
  await api.delete(`/teams/coaches/${coachId}`);
};

export const getCoachTeams = async (coachId: number) => {
  const { data } = await api.get<Team[]>(`/teams/coaches/${coachId}/teams`);
  return data;
};
