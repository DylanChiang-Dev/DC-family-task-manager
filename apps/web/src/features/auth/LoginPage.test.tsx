import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { LoginPage } from "./LoginPage";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({
    accessToken: null,
    user: null,
    currentTeamId: null,
    isBootstrapped: true,
  });
});

describe("LoginPage", () => {
  it("submits credentials and stores auth on success", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({
          success: true,
          data: {
            user: { id: 1, username: "alice", nickname: "A", email: null, currentTeamId: 5, createdAt: 0 },
            team: { id: 5, name: "T", inviteCode: "X", role: "admin" },
            accessToken: "tok",
          },
        }),
      ),
    );
    const user = userEvent.setup();

    renderWithProviders(<LoginPage />);
    await user.type(screen.getByLabelText("用戶名"), "alice");
    await user.type(screen.getByLabelText("密碼"), "secret1");
    await user.click(screen.getByRole("button", { name: "登入" }));

    await waitFor(() => expect(useAuthStore.getState().accessToken).toBe("tok"));
  });

  it("shows server error message on 401", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json(
          { success: false, error: { code: "UNAUTHORIZED", message: "用戶名或密碼錯誤" } },
          { status: 401 },
        ),
      ),
    );
    const user = userEvent.setup();

    renderWithProviders(<LoginPage />);
    await user.type(screen.getByLabelText("用戶名"), "alice");
    await user.type(screen.getByLabelText("密碼"), "secret1");
    await user.click(screen.getByRole("button", { name: "登入" }));

    expect(await screen.findByText("用戶名或密碼錯誤")).toBeInTheDocument();
  });
});
