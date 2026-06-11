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

  it("does not render project tasks in month cells (gantt owns them)", async () => {
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
            {
              id: 8,
              teamId: 1,
              title: "錨點任務",
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
              dueDate: iso(today),
              taskType: "normal",
              recurrenceConfig: null,
              parentTaskId: null,
              projectId: null,
              projectStats: null,
              startDate: null,
              endDate: null,
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

    // 等錨點任務出現（證明數據已載入渲染），再斷言項目不在格中
    expect((await screen.findAllByText("錨點任務")).length).toBeGreaterThan(0);
    expect(screen.queryByText("寫書")).not.toBeInTheDocument();
  });
});
