import { describe, it, expect, afterEach } from "vitest";

import { useAuthStore, type AuthUser } from "../stores/useAuthStore";

const baseUser: AuthUser = {
  id: 1,
  email: "coach@example.com",
  full_name: "Coach User",
  role: "coach",
  is_active: true,
};

describe("useAuthStore role normalization", () => {
  afterEach(() => {
    useAuthStore.setState({ user: null, token: null, isInitialized: false });
    localStorage.clear();
  });

  it("normalizes incoming uppercase roles to lowercase", () => {
    const userWithUpperRole = { ...baseUser, role: "COACH" as unknown as AuthUser["role"] };
    useAuthStore.getState().setCredentials({ user: userWithUpperRole, token: "token-123" });

    expect(useAuthStore.getState().user?.role).toBe("coach");
  });

  it("falls back safely when role is unknown", () => {
    const userWithUnknownRole = { ...baseUser, role: "SUPERADMIN" as unknown as AuthUser["role"] };
    useAuthStore.getState().setCredentials({ user: userWithUnknownRole, token: "token-123" });

    expect(useAuthStore.getState().user?.role).toBe("athlete");
  });
});
