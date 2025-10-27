import type { AuthUser } from "../stores/useAuthStore";
import api from "./client";

type LoginResponse = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  athlete_id?: number | null;
  is_active: boolean;
  access_token: string;
};

export const login = async (
  email: string,
  password: string,
  withProfile = true
): Promise<{ user: AuthUser; token: string }> => {
  const url = withProfile ? "/auth/login/full" : "/auth/login";
  const body = new URLSearchParams();
  body.append("username", email);
  body.append("password", password);

  const { data } = await api.post<LoginResponse | { access_token: string }>(url, body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (withProfile) {
    const payload = data as LoginResponse;
    return {
      token: payload.access_token,
      user: {
        id: payload.id,
        email: payload.email,
        full_name: payload.full_name,
        role: payload.role,
        athlete_id: payload.athlete_id,
        is_active: payload.is_active,
      },
    };
  }

  const token = (data as { access_token: string }).access_token;
  return { token, user: await fetchMe(token) };
};

export const fetchMe = async (tokenOverride?: string): Promise<AuthUser> => {
  const headers = tokenOverride
    ? { Authorization: `Bearer ${tokenOverride}` }
    : undefined;
  const { data } = await api.get<AuthUser>("/auth/me", { headers });
  return data;
};

type SignupResponse = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  athlete_id?: number | null;
  is_active: boolean;
};

export const registerAccount = async (
  fullName: string,
  email: string,
  password: string,
  role: string
): Promise<SignupResponse> => {
  const payload = {
    email,
    full_name: fullName,
    password,
    role,
  };
  const { data } = await api.post<SignupResponse>("/auth/signup", payload);
  return data;
};
