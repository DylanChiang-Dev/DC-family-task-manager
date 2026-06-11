import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { TaskDetailPage } from "./TaskDetailPage";

const BASE = "http://localhost:8787/api";

const task = {
  id: 9,
  teamId: 1,
  title: "倒垃圾",
  description: "晚上八點前",
  creatorId: 1,
  creatorNickname: "Codex",
  assigneeId: null,
  assigneeNickname: null,
  categoryId: null,
  categoryName: null,
  categoryColor: null,
  priority: "medium",
  status: "pending",
  dueDate: "2026-06-12",
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

function Tree() {
  return (
    <Routes>
      <Route path="/tasks/:id" element={<TaskDetailPage />} />
    </Routes>
  );
}

describe("TaskDetailPage", () => {
  it("renders task comments and history", async () => {
    server.use(
      http.get(`${BASE}/tasks/9`, () => HttpResponse.json({ success: true, data: task })),
      http.get(`${BASE}/tasks/9/comments`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 1,
              teamId: 1,
              taskId: 9,
              userId: 1,
              username: "codex",
              nickname: "Codex",
              content: "已提醒",
              createdAt: 0,
            },
          ],
        }),
      ),
      http.get(`${BASE}/tasks/9/history`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 1,
              taskId: 9,
              userId: 1,
              username: "codex",
              nickname: "Codex",
              action: "created",
              changes: { title: "倒垃圾" },
              createdAt: 0,
            },
          ],
        }),
      ),
    );

    renderWithProviders(<Tree />, { route: "/tasks/9" });

    expect(await screen.findByText("倒垃圾")).toBeInTheDocument();
    expect(await screen.findByText("已提醒")).toBeInTheDocument();
    expect(await screen.findByText(/created/)).toBeInTheDocument();
  });

  it("renders project view with progress, children and daily rhythm", async () => {
    const project = {
      ...task,
      id: 9,
      title: "寫《家庭手冊》",
      taskType: "project",
      projectId: null,
      projectStats: { total: 2, completed: 1, progress: 50 },
      startDate: "2026-06-11",
      endDate: "2026-12-31",
      progress: 0,
      isBacklog: false,
    };
    const children = [
      { ...task, id: 11, title: "寫第一章", status: "completed", projectId: 9, projectStats: null, isBacklog: false, progress: 0 },
      { ...task, id: 12, title: "擬大綱", status: "pending", projectId: 9, projectStats: null, isBacklog: false, progress: 0 },
      {
        ...task,
        id: 13,
        title: "每日寫作",
        taskType: "recurring",
        recurrenceConfig: { mode: "interval", every: 1, unit: "day", anchorDate: "2026-06-11" },
        projectId: 9,
        projectStats: null,
        isBacklog: false,
        progress: 0,
      },
    ];
    server.use(
      http.get(`${BASE}/tasks/9`, () => HttpResponse.json({ success: true, data: project })),
      http.get(`${BASE}/tasks`, () => HttpResponse.json({ success: true, data: children })),
      http.get(`${BASE}/tasks/9/comments`, () => HttpResponse.json({ success: true, data: [] })),
      http.get(`${BASE}/tasks/9/history`, () => HttpResponse.json({ success: true, data: [] })),
    );

    renderWithProviders(<Tree />, { route: "/tasks/9" });

    expect(await screen.findByText("寫《家庭手冊》")).toBeInTheDocument();
    expect(await screen.findByText("寫第一章")).toBeInTheDocument();
    expect(screen.getByText("擬大綱")).toBeInTheDocument();
    expect(screen.getByText("已完成 1/2")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("每日節奏")).toBeInTheDocument();
    expect(screen.getByText("每日寫作")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增子任務" })).toBeInTheDocument();
  });

  it("shows parent project breadcrumb on a child task", async () => {
    server.use(
      http.get(`${BASE}/tasks/9`, () =>
        HttpResponse.json({ success: true, data: { ...task, projectId: 5, projectStats: null } }),
      ),
      http.get(`${BASE}/tasks/5`, () =>
        HttpResponse.json({
          success: true,
          data: {
            ...task,
            id: 5,
            title: "寫《家庭手冊》",
            taskType: "project",
            projectId: null,
            projectStats: { total: 1, completed: 0, progress: 0 },
          },
        }),
      ),
      http.get(`${BASE}/tasks/9/comments`, () => HttpResponse.json({ success: true, data: [] })),
      http.get(`${BASE}/tasks/9/history`, () => HttpResponse.json({ success: true, data: [] })),
    );

    renderWithProviders(<Tree />, { route: "/tasks/9" });

    expect(await screen.findByText("倒垃圾")).toBeInTheDocument();
    expect(await screen.findByText(/所屬項目/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "寫《家庭手冊》" })).toBeInTheDocument();
  });

  it("posts a new comment", async () => {
    let posted: unknown = null;
    server.use(
      http.get(`${BASE}/tasks/9`, () => HttpResponse.json({ success: true, data: task })),
      http.get(`${BASE}/tasks/9/comments`, () => HttpResponse.json({ success: true, data: [] })),
      http.get(`${BASE}/tasks/9/history`, () => HttpResponse.json({ success: true, data: [] })),
      http.post(`${BASE}/tasks/9/comments`, async ({ request: req }) => {
        posted = await req.json();
        return HttpResponse.json(
          {
            success: true,
            data: {
              id: 2,
              teamId: 1,
              taskId: 9,
              userId: 1,
              username: "codex",
              nickname: "Codex",
              content: "完成後拍照",
              createdAt: 0,
            },
          },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(<Tree />, { route: "/tasks/9" });
    await screen.findByText("倒垃圾");
    await user.type(screen.getByLabelText("新增留言"), "完成後拍照");
    await user.click(screen.getByRole("button", { name: "送出留言" }));

    await waitFor(() => expect(posted).toEqual({ content: "完成後拍照" }));
  });
});
