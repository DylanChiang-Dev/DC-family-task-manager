import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw-server";
import { useAuthStore } from "@/stores/auth-store";
import { createCategory, deleteCategory, fetchCategories, updateCategory } from "./api";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({
    accessToken: "tok",
    user: null,
    currentTeamId: 1,
    isBootstrapped: true,
  });
});

describe("categories api", () => {
  it("fetches categories", async () => {
    server.use(
      http.get(`${BASE}/categories`, () =>
        HttpResponse.json({
          success: true,
          data: [{ id: 1, teamId: 1, name: "家務", color: "#3B82F6", creatorId: 1, createdAt: 0 }],
        }),
      ),
    );

    const data = await fetchCategories();

    expect(data).toHaveLength(1);
    expect(data[0]?.name).toBe("家務");
  });

  it("creates, updates, and deletes a category", async () => {
    const calls: string[] = [];
    server.use(
      http.post(`${BASE}/categories`, async ({ request: req }) => {
        calls.push(`post:${JSON.stringify(await req.json())}`);
        return HttpResponse.json(
          { success: true, data: { id: 2, teamId: 1, name: "工作", color: "#22C55E", creatorId: 1, createdAt: 0 } },
          { status: 201 },
        );
      }),
      http.patch(`${BASE}/categories/2`, async ({ request: req }) => {
        calls.push(`patch:${JSON.stringify(await req.json())}`);
        return HttpResponse.json({
          success: true,
          data: { id: 2, teamId: 1, name: "工作更新", color: "#EF4444", creatorId: 1, createdAt: 0 },
        });
      }),
      http.delete(`${BASE}/categories/2`, () => {
        calls.push("delete");
        return HttpResponse.json({ success: true, data: { message: "分類已刪除" } });
      }),
    );

    await createCategory({ name: "工作", color: "#22C55E" });
    await updateCategory(2, { name: "工作更新", color: "#EF4444" });
    await deleteCategory(2);

    expect(calls).toEqual([
      'post:{"name":"工作","color":"#22C55E"}',
      'patch:{"name":"工作更新","color":"#EF4444"}',
      "delete",
    ]);
  });
});
