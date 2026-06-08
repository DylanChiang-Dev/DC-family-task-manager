import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw-server";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError, request } from "./api-client";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({
    accessToken: "old",
    user: null,
    currentTeamId: 7,
    isBootstrapped: true,
  });
});

describe("api-client", () => {
  it("returns data on success and sends auth + team headers", async () => {
    let seenAuth = "";
    let seenTeam = "";
    server.use(
      http.get(`${BASE}/tasks`, ({ request: req }) => {
        seenAuth = req.headers.get("Authorization") ?? "";
        seenTeam = req.headers.get("X-Team-Id") ?? "";
        return HttpResponse.json({ success: true, data: [{ id: 1 }] });
      }),
    );

    const data = await request<{ id: number }[]>("/tasks");

    expect(data).toEqual([{ id: 1 }]);
    expect(seenAuth).toBe("Bearer old");
    expect(seenTeam).toBe("7");
  });

  it("on 401 refreshes then replays with the new token", async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/tasks`, ({ request: req }) => {
        calls += 1;
        if (req.headers.get("Authorization") === "Bearer old") {
          return HttpResponse.json(
            { success: false, error: { code: "UNAUTHORIZED", message: "expired" } },
            { status: 401 },
          );
        }
        return HttpResponse.json({ success: true, data: "ok" });
      }),
      http.post(`${BASE}/auth/refresh`, () =>
        HttpResponse.json({ success: true, data: { accessToken: "fresh" } }),
      ),
    );

    const data = await request<string>("/tasks");

    expect(data).toBe("ok");
    expect(calls).toBe(2);
    expect(useAuthStore.getState().accessToken).toBe("fresh");
  });

  it("on 401 with failed refresh clears auth and throws", async () => {
    server.use(
      http.get(`${BASE}/tasks`, () =>
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

    await expect(request("/tasks")).rejects.toBeInstanceOf(ApiError);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it("throws ApiError with code on business failure", async () => {
    server.use(
      http.post(`${BASE}/tasks`, () =>
        HttpResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "bad" } },
          { status: 400 },
        ),
      ),
    );

    await expect(request("/tasks", { method: "POST", body: {} })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
    });
  });
});
