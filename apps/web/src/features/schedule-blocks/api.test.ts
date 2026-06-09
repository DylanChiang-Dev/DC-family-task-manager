import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw-server";
import { useAuthStore } from "@/stores/auth-store";
import {
  createScheduleBlock,
  deleteScheduleBlock,
  fetchScheduleBlocks,
  updateScheduleBlock,
} from "./api";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({
    accessToken: "tok",
    user: null,
    currentTeamId: 1,
    isBootstrapped: true,
  });
});

describe("schedule blocks api", () => {
  it("fetches schedule blocks with date range", async () => {
    let search = "";
    server.use(
      http.get(`${BASE}/schedule-blocks`, ({ request: req }) => {
        search = new URL(req.url).search;
        return HttpResponse.json({
          success: true,
          data: [
            {
              id: 1,
              userId: 1,
              title: "廣州出差",
              location: "廣州",
              startDate: "2026-06-10",
              endDate: "2026-06-12",
              color: "#0EA5E9",
              note: null,
              createdAt: 0,
              updatedAt: 0,
            },
          ],
        });
      }),
    );

    const data = await fetchScheduleBlocks("2026-06-09", "2026-07-20");

    expect(search).toBe("?start=2026-06-09&end=2026-07-20");
    expect(data[0]?.location).toBe("廣州");
  });

  it("creates, updates, and deletes a schedule block", async () => {
    const calls: string[] = [];
    server.use(
      http.post(`${BASE}/schedule-blocks`, async ({ request: req }) => {
        calls.push(`post:${JSON.stringify(await req.json())}`);
        return HttpResponse.json(
          {
            success: true,
            data: {
              id: 1,
              userId: 1,
              title: "深圳",
              location: "深圳",
              startDate: "2026-06-15",
              endDate: "2026-06-17",
              color: "#22C55E",
              note: null,
              createdAt: 0,
              updatedAt: 0,
            },
          },
          { status: 201 },
        );
      }),
      http.patch(`${BASE}/schedule-blocks/1`, async ({ request: req }) => {
        calls.push(`patch:${JSON.stringify(await req.json())}`);
        return HttpResponse.json({
          success: true,
          data: {
            id: 1,
            userId: 1,
            title: "深圳更新",
            location: "深圳",
            startDate: "2026-06-15",
            endDate: "2026-06-18",
            color: "#22C55E",
            note: "延長一天",
            createdAt: 0,
            updatedAt: 1,
          },
        });
      }),
      http.delete(`${BASE}/schedule-blocks/1`, () => {
        calls.push("delete");
        return HttpResponse.json({ success: true, data: { message: "行程已刪除" } });
      }),
    );

    await createScheduleBlock({
      title: "深圳",
      location: "深圳",
      startDate: "2026-06-15",
      endDate: "2026-06-17",
      color: "#22C55E",
      note: null,
    });
    await updateScheduleBlock(1, { title: "深圳更新", endDate: "2026-06-18", note: "延長一天" });
    await deleteScheduleBlock(1);

    expect(calls).toEqual([
      'post:{"title":"深圳","location":"深圳","startDate":"2026-06-15","endDate":"2026-06-17","color":"#22C55E","note":null}',
      'patch:{"title":"深圳更新","endDate":"2026-06-18","note":"延長一天"}',
      "delete",
    ]);
  });
});
