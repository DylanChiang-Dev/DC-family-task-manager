import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw-server";
import { useAuthStore } from "@/stores/auth-store";
import { useBootstrapAuth } from "./useBootstrapAuth";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({
    accessToken: null,
    user: null,
    currentTeamId: null,
    isBootstrapped: false,
  });
});

describe("useBootstrapAuth", () => {
  it("keeps a persisted token by validating it with /auth/me", async () => {
    let seenAuth = "";
    useAuthStore.setState({
      accessToken: "persisted-token",
      user: null,
      currentTeamId: 5,
      isBootstrapped: false,
    });

    server.use(
      http.get(`${BASE}/auth/me`, ({ request }) => {
        seenAuth = request.headers.get("Authorization") ?? "";
        return HttpResponse.json({
          success: true,
          data: {
            user: {
              id: 1,
              username: "alice",
              nickname: "A",
              email: null,
              currentTeamId: 5,
              createdAt: 0,
            },
            teams: [{ id: 5, name: "T", inviteCode: "X", role: "admin" }],
            currentTeam: { id: 5, name: "T", inviteCode: "X", role: "admin" },
          },
        });
      }),
    );

    const { result } = renderHook(() => useBootstrapAuth());

    await waitFor(() => expect(result.current).toBe(true));
    expect(seenAuth).toBe("Bearer persisted-token");
    expect(useAuthStore.getState().user?.username).toBe("alice");
    expect(useAuthStore.getState().accessToken).toBe("persisted-token");
  });

  it("finishes bootstrapping when a persisted token is expired", async () => {
    useAuthStore.setState({
      accessToken: "expired-token",
      user: null,
      currentTeamId: 5,
      isBootstrapped: false,
    });

    server.use(
      http.get(`${BASE}/auth/me`, () =>
        HttpResponse.json(
          { success: false, error: { code: "UNAUTHORIZED", message: "expired" } },
          { status: 401 },
        ),
      ),
      http.post(`${BASE}/auth/refresh`, () =>
        HttpResponse.json(
          { success: false, error: { code: "UNAUTHORIZED", message: "revoked" } },
          { status: 401 },
        ),
      ),
    );

    const { result } = renderHook(() => useBootstrapAuth());

    await waitFor(() => expect(result.current).toBe(true));
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
