import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { SettingsPage } from "./SettingsPage";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({
    accessToken: "tok",
    user: {
      id: 1,
      username: "alice",
      nickname: "Alice",
      email: null,
      currentTeamId: 1,
      createdAt: 0,
    },
    currentTeamId: 1,
    isBootstrapped: true,
  });
});

describe("SettingsPage", () => {
  it("updates profile and syncs auth user", async () => {
    let patched = false;
    server.use(
      http.get(`${BASE}/profile`, () =>
        HttpResponse.json({
          success: true,
          data: {
            id: 1,
            username: "alice",
            nickname: "Alice",
            email: null,
            currentTeamId: 1,
            createdAt: 0,
            updatedAt: 0,
          },
        }),
      ),
      http.patch(`${BASE}/profile`, async ({ request: req }) => {
        const body = (await req.json()) as { nickname: string; email: string };
        expect(body.nickname).toBe("Alice Chen");
        expect(body.email).toBe("alice@example.com");
        patched = true;

        return HttpResponse.json({
          success: true,
          data: {
            id: 1,
            username: "alice",
            nickname: body.nickname,
            email: body.email,
            currentTeamId: 1,
            createdAt: 0,
            updatedAt: 1,
          },
        });
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(<SettingsPage />);

    const nickname = await screen.findByLabelText("暱稱");
    await user.clear(nickname);
    await user.type(nickname, "Alice Chen");
    await user.type(screen.getByLabelText("Email"), "alice@example.com");
    await user.click(screen.getByRole("button", { name: "儲存設定" }));

    await waitFor(() => expect(patched).toBe(true));
    expect(await screen.findByText("設定已更新")).toBeInTheDocument();
    expect(useAuthStore.getState().user?.nickname).toBe("Alice Chen");
  });

  it("requires current password when changing password", async () => {
    server.use(
      http.get(`${BASE}/profile`, () =>
        HttpResponse.json({
          success: true,
          data: {
            id: 1,
            username: "alice",
            nickname: "Alice",
            email: null,
            currentTeamId: 1,
            createdAt: 0,
            updatedAt: 0,
          },
        }),
      ),
    );
    const user = userEvent.setup();

    renderWithProviders(<SettingsPage />);
    await user.type(await screen.findByLabelText("新密碼"), "secret1");
    await user.click(screen.getByRole("button", { name: "儲存設定" }));

    expect(await screen.findByText("修改密碼需要提供當前密碼")).toBeInTheDocument();
  });
});
