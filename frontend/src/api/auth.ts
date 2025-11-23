import { useQuery } from "@tanstack/react-query";

import api from "./client";
import type { AuthUser } from "../stores/useAuthStore";
import { logger } from "../utils/logger";

export type AuthResponse = {
  user: AuthUser;
  token: string;
};

export const fetchMe = async (): Promise<AuthUser> => {
  logger.debug("fetchMe - Making request to /auth/me");
  try {
    const { data } = await api.get<AuthUser>("/auth/me");
    logger.debug("fetchMe - Received data:", data);
    logger.debug("fetchMe - User role:", data?.role);
    logger.debug("fetchMe - Athlete status:", data?.athlete_status);
    return data;
  } catch (error: unknown) {
    logger.error("fetchMe - Error:", error);
    if (typeof error === "object" && error !== null) {
      const maybeError = error as { response?: { status?: number } };
      logger.error("fetchMe - Error response:", maybeError.response);
      logger.error("fetchMe - Error status:", maybeError.response?.status);
    }
    throw error;
  }
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
  role: "coach" | "athlete" = "athlete"
) => {
  const payload = {
    full_name: fullName,
    email,
    password: password ?? "",
    role,
  };
  const { data } = await api.post("/auth/signup", payload);
  return data;
};

export const useUser = () =>
  useQuery<AuthUser>({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

export const requestPasswordReset = async (email: string): Promise<void> => {
  await api.post("/auth/password-reset/request", { email });
};

export const confirmPasswordReset = async (token: string, newPassword: string): Promise<void> => {
  await api.post("/auth/password-reset/confirm", {
    token,
    new_password: newPassword,
  });
};
