import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw-server";
import { fetchMe, login } from "./api";

const BASE = "http://localhost:8787/api";

describe("auth api", () => {
  it("login returns user + accessToken (no refreshToken in body)", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, async ({ request: req }) => {
        const body = (await req.json()) as { username: string };
        expect(body.username).toBe("alice");
        return HttpResponse.json({
          success: true,
          data: {
            user: { id: 1, username: "alice", nickname: "A", email: null, currentTeamId: 5, createdAt: 0 },
            team: { id: 5, name: "T", inviteCode: "X", role: "admin" },
            accessToken: "tok",
          },
        });
      }),
    );

    const res = await login({ username: "alice", password: "secret" });

    expect(res.accessToken).toBe("tok");
    expect(res.user.id).toBe(1);
  });

  it("fetchMe returns teams + currentTeam", async () => {
    server.use(
      http.get(`${BASE}/auth/me`, () =>
        HttpResponse.json({
          success: true,
          data: {
            user: { id: 1, username: "alice", nickname: "A", email: null, currentTeamId: 5, createdAt: 0 },
            teams: [{ id: 5, name: "T", inviteCode: "X", role: "admin" }],
            currentTeam: { id: 5, name: "T", inviteCode: "X", role: "admin" },
          },
        }),
      ),
    );

    const me = await fetchMe();

    expect(me.teams).toHaveLength(1);
    expect(me.currentTeam?.id).toBe(5);
  });
});
