import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { RegisterPage } from "./RegisterPage";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({
    accessToken: null,
    user: null,
    currentTeamId: null,
    isBootstrapped: true,
  });
});

describe("RegisterPage", () => {
  it("registers in create mode and stores auth", async () => {
    server.use(
      http.post(`${BASE}/auth/register`, async ({ request: req }) => {
        const body = (await req.json()) as { teamOption: string };
        expect(body.teamOption).toBe("create");
        return HttpResponse.json(
          {
            success: true,
            data: {
              user: { id: 1, username: "bob", nickname: "B", email: null, currentTeamId: 9, createdAt: 0 },
              team: { id: 9, name: "B的團隊", inviteCode: "ABC123", role: "admin" },
              accessToken: "tok2",
            },
          },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(<RegisterPage />);
    await user.type(screen.getByLabelText("用戶名"), "bob");
    await user.type(screen.getByLabelText("暱稱"), "Bob");
    await user.type(screen.getByLabelText("密碼"), "secret1");
    await user.click(screen.getByRole("button", { name: "註冊" }));

    await waitFor(() => expect(useAuthStore.getState().accessToken).toBe("tok2"));
  });

  it("requires invite code when joining", async () => {
    const user = userEvent.setup();

    renderWithProviders(<RegisterPage />);
    await user.click(screen.getByRole("radio", { name: "加入團隊" }));
    await user.type(screen.getByLabelText("用戶名"), "bob");
    await user.type(screen.getByLabelText("暱稱"), "Bob");
    await user.type(screen.getByLabelText("密碼"), "secret1");
    await user.click(screen.getByRole("button", { name: "註冊" }));

    expect(await screen.findByText("加入團隊需要提供邀請碼")).toBeInTheDocument();
  });
});
