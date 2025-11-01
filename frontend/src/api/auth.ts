import { useQuery } from "@tanstack/react-query";

import api from "./client";
import type { AuthUser } from "../stores/useAuthStore";

export type AuthResponse = {
  user: AuthUser;
  token: string;
};

export const fetchMe = async (): Promise<AuthUser> => {
  const { data } = await api.get<AuthUser>("/auth/me");
  return data;
};

export const login = async (
  email: string,
  password?: string,
  isPasswordLogin: boolean = false
): Promise<AuthResponse> => {
  const payload = isPasswordLogin
    ? new URLSearchParams({ username: email, password: password ?? "" })
    : { email };
  const { data: tokenData } = await api.post<{access_token: string}>(
    "/auth/login",
    payload
  );

  const { data: user } = await api.get<AuthUser>("/auth/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  return { user, token: tokenData.access_token };
};

export const registerAccount = async (
  fullName: string,
  email: string,
  password?: string,
  role: "coach" | "athlete" = "coach"
) => {
  const payload = {
    full_name: fullName,
    email,
    password: password ?? "",
    role,
  };
  const { data } = await api.post("/users/register", payload);
  return data;
};

export const useUser = () =>
  useQuery<AuthUser>({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
