import axios from "axios";

import { useAuthStore } from "../stores/useAuthStore";
import { useThemeStore } from "../theme/useThemeStore";

export const api = axios.create({
  baseURL: "/api/v1",
  timeout: 10_000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Quando o token expira ou a sessão cai, deixamos o fluxo tratar o erro
      // sem deslogar automaticamente; o RequireAuth redireciona na próxima navegação.
    }
    return Promise.reject(error);
  }
);

export default api;
