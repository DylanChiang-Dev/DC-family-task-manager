import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw-server";
import { useAuthStore } from "@/stores/auth-store";
import { createTask, fetchTasks } from "./api";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({
    accessToken: "tok",
    user: null,
    currentTeamId: 1,
    isBootstrapped: true,
  });
});

describe("tasks api", () => {
  it("fetchTasks without status calls /tasks", async () => {
    let search = "";
    server.use(
      http.get(`${BASE}/tasks`, ({ request: req }) => {
        search = new URL(req.url).search;
        return HttpResponse.json({ success: true, data: [] });
      }),
    );

    await fetchTasks("all");

    expect(search).toBe("");
  });

  it("fetchTasks with status adds query param", async () => {
    let search = "";
    server.use(
      http.get(`${BASE}/tasks`, ({ request: req }) => {
        search = new URL(req.url).search;
        return HttpResponse.json({ success: true, data: [] });
      }),
    );

    await fetchTasks("pending");

    expect(search).toBe("?status=pending");
  });

  it("createTask posts body and returns created task", async () => {
    server.use(
      http.post(`${BASE}/tasks`, () =>
        HttpResponse.json({ success: true, data: { id: 10, title: "買菜" } }, { status: 201 }),
      ),
    );

    const t = await createTask({
      title: "買菜",
      priority: "high",
      status: "pending",
      taskType: "normal",
    });

    expect(t.id).toBe(10);
  });
});
