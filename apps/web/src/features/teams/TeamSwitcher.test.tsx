import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { TeamSwitcher } from "./TeamSwitcher";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({
    accessToken: "tok",
    user: null,
    currentTeamId: 1,
    isBootstrapped: true,
  });
});

describe("TeamSwitcher", () => {
  it("lists teams and switches current team", async () => {
    server.use(
      http.get(`${BASE}/teams`, () =>
        HttpResponse.json({
          success: true,
          data: {
            teams: [
              { id: 1, name: "家庭", inviteCode: "A", role: "admin", memberCount: 2, createdAt: 0 },
              { id: 2, name: "工作", inviteCode: "B", role: "member", memberCount: 3, createdAt: 0 },
            ],
            currentTeamId: 1,
          },
        }),
      ),
      http.post(`${BASE}/teams/switch`, async ({ request: req }) => {
        const body = (await req.json()) as { teamId: number };
        return HttpResponse.json({ success: true, data: { currentTeamId: body.teamId } });
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(<TeamSwitcher />);
    await user.click(await screen.findByRole("button", { name: /家庭/ }));
    await user.click(await screen.findByText("工作"));

    await waitFor(() => expect(useAuthStore.getState().currentTeamId).toBe(2));
  });
});
