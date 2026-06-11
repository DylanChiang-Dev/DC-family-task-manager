import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { CalendarPage } from "./CalendarPage";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({
    accessToken: "tok",
    user: null,
    currentTeamId: 1,
    isBootstrapped: true,
  });
});

describe("CalendarPage", () => {
  it("renders month calendar with tasks", async () => {
    server.use(
      http.get(`${BASE}/tasks`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 1,
              teamId: 1,
              title: "繳水費",
              description: null,
              creatorId: 1,
              creatorNickname: "A",
              assigneeId: null,
              assigneeNickname: null,
              categoryId: null,
              categoryName: null,
              categoryColor: null,
              priority: "medium",
              status: "pending",
              dueDate: new Date().toISOString().slice(0, 10),
              taskType: "normal",
              recurrenceConfig: null,
              parentTaskId: null,
              completedAt: null,
              createdAt: 0,
              updatedAt: 0,
            },
          ],
        }),
      ),
    );

    renderWithProviders(<CalendarPage />);

    expect((await screen.findAllByText("繳水費")).length).toBeGreaterThan(0);
  });

  it("shows a project task on every overlapping day of the month", async () => {
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const start = new Date(today);
    start.setDate(today.getDate() - 3);
    const end = new Date(today);
    end.setDate(today.getDate() + 3);
    server.use(
      http.get(`${BASE}/tasks`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 7,
              teamId: 1,
              title: "寫書",
              description: null,
              creatorId: 1,
              creatorNickname: "A",
              assigneeId: null,
              assigneeNickname: null,
              categoryId: null,
              categoryName: null,
              categoryColor: null,
              priority: "medium",
              status: "pending",
              dueDate: null,
              taskType: "project",
              recurrenceConfig: null,
              parentTaskId: null,
              projectId: null,
              projectStats: { total: 0, completed: 0, progress: 0 },
              startDate: iso(start),
              endDate: iso(end),
              progress: 0,
              isBacklog: false,
              completedAt: null,
              createdAt: 0,
              updatedAt: 0,
            },
          ],
        }),
      ),
    );

    renderWithProviders(<CalendarPage />);

    // 跨 7 天的項目應出現在多個日期格（同月內至少 5 格）+ 選中日詳情
    const chips = await screen.findAllByText("寫書");
    expect(chips.length).toBeGreaterThanOrEqual(5);
  });
});
