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
