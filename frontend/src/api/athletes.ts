import api from "./client";
import type { Athlete, AthletePayload } from "../types/athlete";

export const createAthlete = async (payload: AthletePayload): Promise<Athlete> => {
  const { data } = await api.post<Athlete>("/athletes", payload);
  return data;
};

export const updateAthlete = async (
  id: number,
  payload: Partial<AthletePayload>
): Promise<Athlete> => {
  const { data } = await api.patch<Athlete>(`/athletes/${id}`, payload);
  return data;
};

export const deleteAthlete = async (id: number): Promise<void> => {
  await api.delete(`/athletes/${id}`);
};

export const uploadAthletePhoto = async (id: number, file: File): Promise<Athlete> => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<Athlete>(`/athletes/${id}/photo`, formData);
  return data;
};
