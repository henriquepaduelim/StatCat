import api from "./client";

export interface GoogleCredential {
  id: number;
  user_id: number;
  client_id: number | null;
  account_email: string;
  calendar_id: string;
  expires_at: string | null;
  scope: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export const getGoogleCredential = async () => {
  const { data } = await api.get<GoogleCredential | null>("/calendar/google/me");
  return data;
};

export const getGoogleAuthorizationUrl = async (clientId?: number) => {
  const params = clientId ? { client_id: clientId } : undefined;
  const { data } = await api.get<{ authorization_url: string }>(
    "/calendar/google/authorize",
    { params }
  );
  return data.authorization_url;
};

