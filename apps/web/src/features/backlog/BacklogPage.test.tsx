import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { BacklogPage } from "./BacklogPage";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({
    accessToken: "tok",
    user: null,
    currentTeamId: 1,
    isBootstrapped: true,
  });
});

describe("BacklogPage", () => {
  it("quick-captures an idea as a backlog task", async () => {
    let posted: any = null;
    server.use(
      http.get(`${BASE}/tasks`, () => HttpResponse.json({ success: true, data: [] })),
      http.post(`${BASE}/tasks`, async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json({ success: true, data: { id: 9 } }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<BacklogPage />);

    await user.type(screen.getByLabelText("捕捉靈感"), "學吉他");
    await user.click(screen.getByRole("button", { name: "加入靈感箱" }));

    await waitFor(() =>
      expect(posted).toMatchObject({ title: "學吉他", isBacklog: true }),
    );
  });

  it("lists backlog items and opens promote dialog", async () => {
    server.use(
      http.get(`${BASE}/tasks`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 1, teamId: 1, title: "整理車庫", description: null, creatorId: 1,
              creatorNickname: "", assigneeId: null, assigneeNickname: null,
              categoryId: null, categoryName: null, categoryColor: null,
              priority: "medium", status: "pending", dueDate: null, taskType: "normal",
              recurrenceConfig: null, parentTaskId: null, startDate: null, endDate: null,
              progress: 0, isBacklog: true, completedAt: null, createdAt: 0, updatedAt: 0,
            },
          ],
        }),
      ),
      http.get(`${BASE}/categories`, () => HttpResponse.json({ success: true, data: [] })),
      http.get(`${BASE}/teams/1/members`, () => HttpResponse.json({ success: true, data: [] })),
    );
    const user = userEvent.setup();
    renderWithProviders(<BacklogPage />);

    expect(await screen.findByText("整理車庫")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "升級 整理車庫" }));
    expect(await screen.findByText("升級成任務")).toBeInTheDocument();
  });

  it("shows empty state when backlog is empty", async () => {
    server.use(
      http.get(`${BASE}/tasks`, () => HttpResponse.json({ success: true, data: [] })),
    );
    renderWithProviders(<BacklogPage />);

    expect(await screen.findByText("靈感箱是空的")).toBeInTheDocument();
  });
});
