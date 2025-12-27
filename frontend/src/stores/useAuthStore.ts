import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AthleteStatus = "INCOMPLETE" | "PENDING" | "APPROVED" | "REJECTED";
export type AuthUserRole = "admin" | "staff" | "coach" | "athlete";

export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  photo_url?: string | null;
  phone?: string | null;
  role: AuthUserRole;
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

type PersistedAuthState = Pick<AuthState, "user" | "token">;

const validRoles: AuthUserRole[] = ["admin", "staff", "coach", "athlete"];
const isAuthUserRole = (value: string): value is AuthUserRole =>
  validRoles.includes(value as AuthUserRole);

const normalizeRole = (role: unknown): AuthUserRole => {
  if (typeof role === "string") {
    const lowered = role.toLowerCase();
    if (isAuthUserRole(lowered)) {
      return lowered;
    }
  }
  if (import.meta.env.DEV) {
    // In dev, surface unexpected values to avoid silent regressions.
    // eslint-disable-next-line no-console
    console.warn(`[auth] Unexpected role value received: ${String(role)}`);
  }
  // Default to the least-privileged role if the value is unknown.
  return "athlete";
};

const normalizeUser = (user: AuthUser): AuthUser => ({
  ...user,
  role: normalizeRole(user.role),
});

const initialState: Pick<AuthState, "user" | "token" | "isInitialized"> = {
  user: null,
  token: null,
  isInitialized: false,
};

export const useAuthStore = create<AuthState>()(
  persist<AuthState, [], [], PersistedAuthState>(
    (set) => ({
      ...initialState,
      setCredentials: ({ user, token }) => set({ user: normalizeUser(user), token }),
      setInitialized: (value) => set({ isInitialized: value }),
      clear: () => set({ user: null, token: null, isInitialized: true }),
    }),
    {
      name: "combine-auth",
      version: 1,
      migrate: (persistedState: unknown, _version: number): PersistedAuthState => {
        const state = persistedState as PersistedAuthState | null;
        const normalizedUser = state?.user ? normalizeUser(state.user) : null;
        return { token: state?.token ?? null, user: normalizedUser };
      },
      partialize: (state): PersistedAuthState => ({ token: state.token, user: state.user }),
    }
  )
);
  