import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { TeamsPage } from "./TeamsPage";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({
    accessToken: "tok",
    user: { id: 1, username: "alice", nickname: "Alice", email: null, currentTeamId: 1, createdAt: 0 },
    currentTeamId: 1,
    isBootstrapped: true,
  });
});

describe("TeamsPage", () => {
  it("creates a team and makes it current", async () => {
    let created = false;
    server.use(
      http.get(`${BASE}/teams`, () =>
        HttpResponse.json({
          success: true,
          data: {
            teams: created
              ? [
                  { id: 1, name: "家庭", inviteCode: "ABC123", role: "admin", memberCount: 1, createdAt: 0 },
                  { id: 2, name: "工作", inviteCode: "XYZ789", role: "admin", memberCount: 1, createdAt: 0 },
                ]
              : [{ id: 1, name: "家庭", inviteCode: "ABC123", role: "admin", memberCount: 1, createdAt: 0 }],
            currentTeamId: created ? 2 : 1,
          },
        }),
      ),
      http.post(`${BASE}/teams`, async ({ request: req }) => {
        const body = (await req.json()) as { name: string };
        expect(body.name).toBe("工作");
        created = true;
        return HttpResponse.json(
          { success: true, data: { id: 2, name: "工作", inviteCode: "XYZ789", role: "admin", memberCount: 1, createdAt: 0 } },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(<TeamsPage />);
    expect(await screen.findByText("家庭")).toBeInTheDocument();
    await user.type(screen.getByLabelText("新團隊名稱"), "工作");
    await user.click(screen.getByRole("button", { name: "建立團隊" }));

    expect(await screen.findByText("工作")).toBeInTheDocument();
    await waitFor(() => expect(useAuthStore.getState().currentTeamId).toBe(2));
  });

  it("joins a team with invite code", async () => {
    let joined = false;
    server.use(
      http.get(`${BASE}/teams`, () =>
        HttpResponse.json({
          success: true,
          data: {
            teams: joined
              ? [
                  { id: 1, name: "家庭", inviteCode: "ABC123", role: "admin", memberCount: 1, createdAt: 0 },
                  { id: 3, name: "朋友", inviteCode: "JOINME", role: "member", memberCount: 2, createdAt: 0 },
                ]
              : [{ id: 1, name: "家庭", inviteCode: "ABC123", role: "admin", memberCount: 1, createdAt: 0 }],
            currentTeamId: joined ? 3 : 1,
          },
        }),
      ),
      http.post(`${BASE}/teams/join`, async ({ request: req }) => {
        const body = (await req.json()) as { inviteCode: string };
        expect(body.inviteCode).toBe("JOINME");
        joined = true;
        return HttpResponse.json({
          success: true,
          data: { id: 3, name: "朋友", inviteCode: "JOINME", role: "member", memberCount: 2, createdAt: 0 },
        });
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(<TeamsPage />);
    await user.type(await screen.findByLabelText("邀請碼"), "joinme");
    await user.click(screen.getByRole("button", { name: "加入團隊" }));

    expect(await screen.findByText("朋友")).toBeInTheDocument();
    await waitFor(() => expect(useAuthStore.getState().currentTeamId).toBe(3));
  });
});
