import api from "./client";
import type {
  Athlete,
  AthletePayload,
  AthleteRegistrationPayload,
  AthleteRegistrationCompletionPayload,
  AthleteDocumentMetadata,
  PendingAthleteSummary,
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

export const approveAthlete = async (athleteId: number): Promise<void> => {
  await api.post(`/athletes/${athleteId}/approve`);
};

export const approveAllAthletes = async (): Promise<void> => {
  await api.post(`/athletes/approve-all`);
};

export const rejectAthlete = async (
  athleteId: number, 
  reason: string
): Promise<void> => {
  await api.post(`/athletes/${athleteId}/reject`, null, {
    params: { reason },
  });
};

export const getPendingAthletesCount = async (): Promise<{ count: number }> => {
  const { data } = await api.get("/athletes/pending/count");
  return data;
};

export const getPendingAthletes = async (): Promise<PendingAthleteSummary[]> => {
  const { data } = await api.get<PendingAthleteSummary[]>("/athletes/pending");
  return data;
};

export const submitForApproval = async (athleteId: number): Promise<void> => {
  await api.post(`/athletes/${athleteId}/submit-for-approval`);
};
