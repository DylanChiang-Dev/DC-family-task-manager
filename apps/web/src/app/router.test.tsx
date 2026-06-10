import { beforeEach, describe, expect, it } from "vitest";
import { Navigate, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { BacklogPage } from "@/features/backlog/BacklogPage";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({
    accessToken: "tok",
    user: null,
    currentTeamId: 1,
    isBootstrapped: true,
  });
  server.use(
    http.get(`${BASE}/tasks`, () => HttpResponse.json({ success: true, data: [] })),
    http.get(`${BASE}/schedule-blocks`, () => HttpResponse.json({ success: true, data: [] })),
  );
});

describe("router", () => {
  it("redirects /calendar to the dashboard", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/calendar" element={<Navigate to="/" replace />} />
      </Routes>,
      { route: "/calendar" },
    );

    expect(await screen.findByText("家庭工作台")).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe("/"));
  });

  it("renders the backlog page at /backlog", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/backlog" element={<BacklogPage />} />
      </Routes>,
      { route: "/backlog" },
    );

    expect(await screen.findByText("🗂 靈感箱")).toBeInTheDocument();
  });
});
