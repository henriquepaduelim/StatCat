import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";

import { RedirectToDashboardOrPlayerProfile } from "../App";
import type { AuthUser } from "../stores/useAuthStore";

const authState = {
  user: null as Partial<AuthUser> | null,
  isInitialized: true,
};

const useAuthStoreMock = vi.fn((selector: (state: typeof authState) => unknown) => selector(authState));

vi.mock("../stores/useAuthStore", () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => useAuthStoreMock(selector),
}));

const renderRedirect = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<RedirectToDashboardOrPlayerProfile />} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/pending-approval" element={<div>Pending Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        <Route path="/player-profile" element={<div>Player Profile Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("RedirectToDashboardOrPlayerProfile", () => {
  afterEach(() => {
    authState.user = null;
    authState.isInitialized = true;
    vi.clearAllMocks();
  });

  it("waits for initialization", () => {
    authState.isInitialized = false;
    renderRedirect();
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it("redirects to login when no user exists", () => {
    renderRedirect();
    expect(screen.getByText(/Login Page/)).toBeInTheDocument();
  });

  it("redirects approved athletes to player profile", () => {
    authState.user = { role: "athlete", athlete_status: "APPROVED" };
    renderRedirect();
    expect(screen.getByText(/Player Profile Page/)).toBeInTheDocument();
  });

  it("keeps pending athletes on login", () => {
    authState.user = { role: "athlete", athlete_status: "PENDING" };
    renderRedirect();
    expect(screen.getByText(/Pending Page/)).toBeInTheDocument();
  });

  it("sends staff/admin users to dashboard", () => {
    authState.user = { role: "admin" };
    renderRedirect();
    expect(screen.getByText(/Dashboard Page/)).toBeInTheDocument();
  });
});
