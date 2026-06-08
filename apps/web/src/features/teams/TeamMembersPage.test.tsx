import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { TeamMembersPage } from "./TeamMembersPage";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  useAuthStore.setState({
    accessToken: "tok",
    user: { id: 1, username: "alice", nickname: "Alice", email: null, currentTeamId: 1, createdAt: 0 },
    currentTeamId: 1,
    isBootstrapped: true,
  });
});

describe("TeamMembersPage", () => {
  it("renames team and removes a member", async () => {
    let removed = false;
    let renamed = false;
    server.use(
      http.get(`${BASE}/teams/1`, () =>
        HttpResponse.json({
          success: true,
          data: {
            id: 1,
            name: renamed ? "家庭更新" : "家庭",
            inviteCode: "ABC123",
            createdBy: 1,
            role: "admin",
            createdAt: 0,
            updatedAt: renamed ? 1 : 0,
          },
        }),
      ),
      http.get(`${BASE}/teams/1/members`, () =>
        HttpResponse.json({
          success: true,
          data: removed
            ? [{ id: 1, teamId: 1, userId: 1, username: "alice", nickname: "Alice", role: "admin", joinedAt: 0 }]
            : [
                { id: 1, teamId: 1, userId: 1, username: "alice", nickname: "Alice", role: "admin", joinedAt: 0 },
                { id: 2, teamId: 1, userId: 2, username: "bob", nickname: "Bob", role: "member", joinedAt: 0 },
              ],
        }),
      ),
      http.patch(`${BASE}/teams/1`, async ({ request: req }) => {
        const body = (await req.json()) as { name: string };
        expect(body.name).toBe("家庭更新");
        renamed = true;
        return HttpResponse.json({ success: true, data: { id: 1, name: body.name, updatedAt: 1 } });
      }),
      http.delete(`${BASE}/teams/1/members/2`, () => {
        removed = true;
        return HttpResponse.json({ success: true, data: { message: "成員已移除" } });
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/teams/:id/members" element={<TeamMembersPage />} />
      </Routes>,
      { route: "/teams/1/members" },
    );
    expect(await screen.findByText("Bob")).toBeInTheDocument();

    const name = screen.getByLabelText("團隊名稱");
    await user.clear(name);
    await user.type(name, "家庭更新");
    await user.click(screen.getByRole("button", { name: "儲存名稱" }));
    await waitFor(() => expect(renamed).toBe(true));

    await user.click(screen.getByRole("button", { name: "移除" }));
    await waitFor(() => expect(removed).toBe(true));
  });
});
