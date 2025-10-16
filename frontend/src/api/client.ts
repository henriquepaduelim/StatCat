import axios, { AxiosHeaders } from "axios";

import { useAuthStore } from "../stores/useAuthStore";

const AUTH_STORAGE_KEY = "combine-auth";

const readPersistedToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch (error) {
    console.error("Failed to read persisted auth token", error);
    return null;
  }
};

export const api = axios.create({
  baseURL: "/api/v1",
  timeout: 10_000,
});

api.interceptors.request.use((config) => {
  let token = useAuthStore.getState().token;
  if (!token) {
    token = readPersistedToken();
  }

  if (token) {
    const headers = AxiosHeaders.from(config.headers ?? {});
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle expired tokens via the normal flow without forcing a logout.
      // RequireAuth will redirect on the next navigation attempt.
    }
    return Promise.reject(error);
  }
);

export default api;
