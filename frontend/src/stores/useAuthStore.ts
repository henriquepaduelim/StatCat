import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AthleteStatus = "INCOMPLETE" | "PENDING" | "APPROVED" | "REJECTED";

export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  photo_url?: string | null;
  phone?: string | null;
  role: "admin" | "staff" | "coach" | "athlete" | string;
  athlete_id?: number | null;
  team_id?: number | null;
  athlete_status?: AthleteStatus;
  rejection_reason?: string | null;
  is_active: boolean;
};

export type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isInitialized: boolean;
  setCredentials: (payload: { user: AuthUser; token: string }) => void;
  setInitialized: (value: boolean) => void;
  clear: () => void;
};

const initialState: Pick<AuthState, "user" | "token" | "isInitialized"> = {
  user: null,
  token: null,
  isInitialized: false,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,
      setCredentials: ({ user, token }) => set({ user, token }),
      setInitialized: (value) => set({ isInitialized: value }),
      clear: () => set({ user: null, token: null, isInitialized: true }),
    }),
    {
      name: "combine-auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
