import { beforeEach, describe, expect, it } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { ProtectedRoute } from "./ProtectedRoute";

beforeEach(() => {
  useAuthStore.setState({
    accessToken: null,
    user: null,
    currentTeamId: null,
    isBootstrapped: true,
  });
});

function Tree() {
  return (
    <Routes>
      <Route path="/login" element={<div>login-screen</div>} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<div>dashboard</div>} />
      </Route>
    </Routes>
  );
}

describe("ProtectedRoute", () => {
  it("redirects to /login when no token", () => {
    renderWithProviders(<Tree />, { route: "/" });
    expect(screen.getByText("login-screen")).toBeInTheDocument();
  });

  it("renders child route when authenticated", () => {
    useAuthStore.setState({ accessToken: "tok" });
    renderWithProviders(<Tree />, { route: "/" });
    expect(screen.getByText("dashboard")).toBeInTheDocument();
  });
});
