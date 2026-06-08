import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { TaskListPage } from "./TaskListPage";

const BASE = "http://localhost:8787/api";

const sampleTask = {
  id: 1,
  teamId: 1,
  title: "買菜",
  description: null,
  creatorId: 1,
  creatorNickname: "A",
  assigneeId: null,
  assigneeNickname: null,
  categoryId: null,
  categoryName: null,
  categoryColor: null,
  priority: "high",
  status: "pending",
  dueDate: "2026-06-10",
  taskType: "normal",
  recurrenceConfig: null,
  parentTaskId: null,
  completedAt: null,
  createdAt: 0,
  updatedAt: 0,
};

beforeEach(() => {
  useAuthStore.setState({
    accessToken: "tok",
    user: null,
    currentTeamId: 1,
    isBootstrapped: true,
  });
});

describe("TaskListPage", () => {
  it("renders tasks from the API", async () => {
    server.use(
      http.get(`${BASE}/tasks`, () => HttpResponse.json({ success: true, data: [sampleTask] })),
    );

    renderWithProviders(<TaskListPage />);

    expect(await screen.findByText("買菜")).toBeInTheDocument();
  });

  it("shows empty state when no tasks", async () => {
    server.use(
      http.get(`${BASE}/tasks`, () => HttpResponse.json({ success: true, data: [] })),
    );

    renderWithProviders(<TaskListPage />);

    expect(await screen.findByText("目前沒有任務")).toBeInTheDocument();
  });
});
