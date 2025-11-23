import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";

import ProtectedRoute from "../components/ProtectedRoute";
import type { Permissions } from "../hooks/usePermissions";
import type { AuthUser } from "../stores/useAuthStore";

const authState = {
  token: null as string | null,
  user: null as Partial<AuthUser> | null,
  isInitialized: true,
};

const permissionsState: Permissions = {
  canViewDashboard: false,
  canViewAthletes: false,
  canCreateAthletes: false,
  canEditAthletes: false,
  canDeleteAthletes: false,
  canViewReports: false,
  canViewAllReports: false,
  canCreateCoaches: false,
  canManageUsers: false,
};

const useAuthStoreMock = vi.fn((selector?: (state: typeof authState) => unknown) => {
  if (typeof selector === "function") {
    return selector(authState);
  }
  return authState;
});

vi.mock("../stores/useAuthStore", () => ({
  useAuthStore: (selector?: (state: typeof authState) => unknown) => useAuthStoreMock(selector),
}));

vi.mock("../hooks/usePermissions", () => ({
  usePermissions: () => permissionsState,
}));

vi.mock("../hooks/useAuthBootstrap", () => ({
  useAuthBootstrap: vi.fn(),
}));

vi.mock("../i18n/useTranslation", () => ({
  useTranslation: () => ({
    common: { loading: "Loading..." },
  }),
}));

const renderProtectedRoute = (requiredPermission?: keyof Permissions, fallbackPath?: string) => {
  return render(
    <MemoryRouter initialEntries={["/private"]}>
      <Routes>
        <Route
          path="/private"
          element={
            <ProtectedRoute
              requiredPermission={requiredPermission as keyof typeof permissionsState}
              fallbackPath={fallbackPath}
            >
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/player-profile" element={<div>Player Profile Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("ProtectedRoute", () => {
  beforeEach(() => {
    authState.token = null;
    authState.user = null;
    authState.isInitialized = true;
    (Object.keys(permissionsState) as Array<keyof Permissions>).forEach((key) => {
      permissionsState[key] = false;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading while auth is initializing", () => {
    authState.isInitialized = false;
    renderProtectedRoute();
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it("redirects unauthenticated users to login", () => {
    renderProtectedRoute();
    expect(screen.getByText(/Login Page/)).toBeInTheDocument();
  });

  it("renders children when permission is satisfied", () => {
    authState.token = "token";
    authState.user = { role: "admin", athlete_status: "APPROVED" };
    permissionsState.canViewDashboard = true;

    renderProtectedRoute("canViewDashboard");
    expect(screen.getByText(/Protected Content/)).toBeInTheDocument();
  });

  it("redirects athletes without permission back to login", () => {
    authState.token = "token";
    authState.user = { role: "athlete", athlete_status: "PENDING" };

    renderProtectedRoute("canViewDashboard");
    expect(screen.getByText(/Login Page/)).toBeInTheDocument();
  });

  it("redirects non-athletes without permission to fallback path", () => {
    authState.token = "token";
    authState.user = { role: "coach", athlete_status: "APPROVED" };

    renderProtectedRoute("canViewDashboard", "/player-profile");
    expect(screen.getByText(/Player Profile Page/)).toBeInTheDocument();
  });
});
