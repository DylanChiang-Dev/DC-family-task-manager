import { beforeEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { screen, within } from "@testing-library/react";
import type { TaskResponse } from "@ftm/shared";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { formatDateKey } from "@/features/calendar/recurrence";
import { DashboardPage } from "./DashboardPage";

const BASE = "http://localhost:8787/api";

function dateKey(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return formatDateKey(date);
}

function task(overrides: Partial<TaskResponse> & Pick<TaskResponse, "id" | "title">): TaskResponse {
  const { id, title, ...rest } = overrides;
  return {
    id,
    teamId: 1,
    title,
    description: null,
    creatorId: 1,
    creatorNickname: "管理員",
    assigneeId: null,
    assigneeNickname: null,
    categoryId: null,
    categoryName: null,
    categoryColor: null,
    priority: "medium",
    status: "pending",
    dueDate: null,
    taskType: "normal",
    recurrenceConfig: null,
    parentTaskId: null,
    completedAt: null,
    createdAt: 0,
    updatedAt: 0,
    ...rest,
  };
}

const tasks = [
  task({ id: 1, title: "今天高優先任務", priority: "high", dueDate: dateKey(0) }),
  task({ id: 2, title: "明天採買", priority: "medium", dueDate: dateKey(1) }),
  task({ id: 3, title: "逾期未完成", priority: "high", dueDate: dateKey(-1) }),
  task({ id: 4, title: "逾期已完成", status: "completed", dueDate: dateKey(-2) }),
  task({ id: 5, title: "逾期已取消", status: "cancelled", dueDate: dateKey(-3) }),
  task({ id: 6, title: "進行中安排", status: "in_progress", dueDate: dateKey(2) }),
  task({
    id: 7,
    title: "每日閱讀",
    taskType: "recurring",
    recurrenceConfig: { frequency: "daily" },
    dueDate: dateKey(0),
  }),
];

beforeEach(() => {
  useAuthStore.setState({
    accessToken: "tok",
    user: null,
    currentTeamId: 1,
    isBootstrapped: true,
  });
  server.use(
    http.get(`${BASE}/tasks`, () => HttpResponse.json({ success: true, data: tasks })),
    http.get(`${BASE}/categories`, () => HttpResponse.json({ success: true, data: [] })),
    http.get(`${BASE}/teams/1/members`, () => HttpResponse.json({ success: true, data: [] })),
  );
});

describe("DashboardPage", () => {
  it("renders calendar, summary cards, and a single create task button", async () => {
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("家庭工作台")).toBeInTheDocument();
    const overview = screen.getByLabelText("工作台概覽");
    expect(within(overview).getByText("今天")).toBeInTheDocument();
    expect(within(overview).getByText("逾期")).toBeInTheDocument();
    expect(within(overview).getByText("進行中")).toBeInTheDocument();
    expect(within(overview).getByText("本月")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "新增任務" })).toHaveLength(1);
    expect((await screen.findAllByText("每日閱讀")).length).toBeGreaterThan(0);
  });

  it("changes the selected-day task list when a date is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />);

    expect((await screen.findAllByText("今天高優先任務")).length).toBeGreaterThan(0);

    const tomorrow = new Date(`${dateKey(1)}T00:00:00`);
    const tomorrowButton = screen
      .getAllByRole("button")
      .find((button) => within(button).queryByText(String(tomorrow.getDate())));

    expect(tomorrowButton).toBeTruthy();
    await user.click(tomorrowButton!);

    expect((await screen.findAllByText("明天採買")).length).toBeGreaterThan(0);
  });

  it("excludes completed and cancelled tasks from overdue list", async () => {
    renderWithProviders(<DashboardPage />);

    const overdueSection = await screen.findByLabelText("逾期未完成任務");
    expect(within(overdueSection).getAllByText("逾期未完成").length).toBeGreaterThan(0);
    expect(within(overdueSection).queryByText("逾期已完成")).not.toBeInTheDocument();
    expect(within(overdueSection).queryByText("逾期已取消")).not.toBeInTheDocument();
  });

  it("shows recurring tasks in the matching date list", async () => {
    renderWithProviders(<DashboardPage />);

    expect((await screen.findAllByText("每日閱讀")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("週期").length).toBeGreaterThan(0);
  });

  it("keeps the full month calendar collapsed on mobile until requested", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByLabelText("行動日期條")).toBeInTheDocument();
    expect(screen.queryByLabelText("手機本月日曆")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "展開本月日曆" }));

    expect(screen.getByLabelText("手機本月日曆")).toBeInTheDocument();
  });
});
