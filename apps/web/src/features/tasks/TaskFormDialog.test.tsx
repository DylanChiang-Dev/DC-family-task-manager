import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { TaskFormDialog } from "./TaskFormDialog";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({
    accessToken: "tok",
    user: null,
    currentTeamId: 1,
    isBootstrapped: true,
  });
  server.use(
    http.get(`${BASE}/categories`, () => HttpResponse.json({ success: true, data: [] })),
    http.get(`${BASE}/teams/1/members`, () =>
      HttpResponse.json({
        success: true,
        data: [
          { id: 1, teamId: 1, userId: 1, username: "alice", nickname: "Alice", role: "admin", joinedAt: 0 },
          { id: 2, teamId: 1, userId: 2, username: "bob", nickname: "Bob", role: "member", joinedAt: 0 },
        ],
      }),
    ),
  );
});

describe("TaskFormDialog", () => {
  it("creates a task on submit", async () => {
    let posted: unknown = null;
    server.use(
      http.post(`${BASE}/tasks`, async ({ request: req }) => {
        posted = await req.json();
        return HttpResponse.json({ success: true, data: { id: 1 } }, { status: 201 });
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(<TaskFormDialog open onOpenChange={() => {}} />);
    await user.type(screen.getByLabelText("標題"), "倒垃圾");
    await user.click(screen.getByRole("button", { name: "建立" }));

    await waitFor(() => expect(posted).toMatchObject({ title: "倒垃圾" }));
  });

  it("creates an anchored weekly recurring task", async () => {
    let posted: unknown = null;
    server.use(
      http.post(`${BASE}/tasks`, async ({ request: req }) => {
        posted = await req.json();
        return HttpResponse.json({ success: true, data: { id: 1 } }, { status: 201 });
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(<TaskFormDialog open onOpenChange={() => {}} />);
    await user.type(screen.getByLabelText("標題"), "每週掃地");
    await user.click(screen.getByLabelText("任務類型"));
    await user.click((await screen.findAllByText("週期")).at(-1)!);

    // 預設模式為「對齊」週，輸入週幾
    await user.click(screen.getByLabelText("重複模式"));
    await user.click((await screen.findAllByText("對齊特定日")).at(-1)!);
    await user.click(screen.getByLabelText("對齊單位"));
    await user.click((await screen.findAllByText("每週")).at(-1)!);
    await user.clear(screen.getByLabelText("星期（0=日，逗號分隔）"));
    await user.type(screen.getByLabelText("星期（0=日，逗號分隔）"), "1,3");

    await user.click(screen.getByRole("button", { name: "建立" }));

    await waitFor(() =>
      expect(posted).toMatchObject({
        title: "每週掃地",
        taskType: "recurring",
        recurrenceConfig: { mode: "anchored", unit: "week", weekdays: [1, 3] },
      }),
    );
  });

  it("creates an interval recurring task", async () => {
    let posted: unknown = null;
    server.use(
      http.post(`${BASE}/tasks`, async ({ request: req }) => {
        posted = await req.json();
        return HttpResponse.json({ success: true, data: { id: 1 } }, { status: 201 });
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(<TaskFormDialog open onOpenChange={() => {}} />);
    await user.type(screen.getByLabelText("標題"), "每10週回診");
    await user.click(screen.getByLabelText("任務類型"));
    await user.click((await screen.findAllByText("週期")).at(-1)!);

    await user.click(screen.getByLabelText("重複模式"));
    await user.click((await screen.findAllByText("固定間隔")).at(-1)!);
    const everyInput = screen.getByLabelText("間隔數");
    await user.tripleClick(everyInput);
    await user.keyboard("10");

    await user.click(screen.getByRole("button", { name: "建立" }));

    await waitFor(() =>
      expect(posted).toMatchObject({
        title: "每10週回診",
        taskType: "recurring",
        recurrenceConfig: { mode: "interval", every: 10, unit: "week" },
      }),
    );
  });

  it("creates a window task with start/end", async () => {
    let posted: unknown = null;
    server.use(
      http.post(`${BASE}/tasks`, async ({ request: req }) => {
        posted = await req.json();
        return HttpResponse.json({ success: true, data: { id: 1 } }, { status: 201 });
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(<TaskFormDialog open onOpenChange={() => {}} />);
    await user.type(screen.getByLabelText("標題"), "規劃旅遊");
    await user.click(screen.getByLabelText("任務類型"));
    await user.click((await screen.findAllByText("時間段")).at(-1)!);
    fireEvent.change(screen.getByLabelText("開始日期"), { target: { value: "2026-06-10" } });
    fireEvent.change(screen.getByLabelText("結束日期"), { target: { value: "2026-06-20" } });
    await user.click(screen.getByRole("button", { name: "建立" }));

    await waitFor(() =>
      expect(posted).toMatchObject({
        title: "規劃旅遊",
        taskType: "window",
        startDate: "2026-06-10",
        endDate: "2026-06-20",
      }),
    );
  });

  it("shows validation error when title is empty", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TaskFormDialog open onOpenChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: "建立" }));

    expect(await screen.findByText("標題不能為空")).toBeInTheDocument();
  });
});
