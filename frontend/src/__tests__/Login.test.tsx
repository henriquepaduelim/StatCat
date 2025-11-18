import { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";

import Login from "../pages/Login";

const renderLogin = () => {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Suspense fallback={null}>
          <Login />
        </Suspense>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("Login page", () => {
  it("renders the sign-in button", () => {
    renderLogin();
    const signInButtons = screen.getAllByRole("button", { name: /sign in/i });
    expect(signInButtons.length).toBeGreaterThan(0);
  });
});
