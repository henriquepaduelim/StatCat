import axios from "axios";

import { useAuthStore } from "../stores/useAuthStore";

// Use environment variable for API base URL, fallback to localhost for development
const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: `${baseURL}/api/v1`,
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we get a 401 error, clear the auth state
    if (error.response?.status === 401) {
      const { clear } = useAuthStore.getState();
      clear();
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
