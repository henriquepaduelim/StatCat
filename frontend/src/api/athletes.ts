import api from "./client";
import type {
  Athlete,
  AthletePayload,
  AthleteRegistrationPayload,
  AthleteRegistrationCompletionPayload,
  AthleteDocumentMetadata,
} from "../types/athlete";

export const createAthlete = async (payload: AthletePayload): Promise<Athlete> => {
  const { data } = await api.post<Athlete>("/athletes/", payload);
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

export const registerAthlete = async (
  payload: AthleteRegistrationPayload
): Promise<Athlete> => {
  const { data } = await api.post<Athlete>("/athletes/register", payload);
  return data;
};

export const completeAthleteRegistration = async (
  athleteId: number,
  payload: AthleteRegistrationCompletionPayload
): Promise<Athlete> => {
  const { data } = await api.post<Athlete>(
    `/athletes/${athleteId}/registration/complete`,
    payload
  );
  return data;
};

export interface UploadAthleteDocumentResponse extends AthleteDocumentMetadata {
  id: number;
  uploaded_at: string;
}

export const uploadAthleteDocument = async (
  athleteId: number,
  label: string,
  file: File
): Promise<UploadAthleteDocumentResponse> => {
  const formData = new FormData();
  formData.append("label", label);
  formData.append("file", file);
  const { data } = await api.post<UploadAthleteDocumentResponse>(
    `/athletes/${athleteId}/documents`,
    formData
  );
  return data;
};
