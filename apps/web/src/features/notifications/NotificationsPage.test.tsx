import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { NotificationsPage } from "./NotificationsPage";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({
    accessToken: "tok",
    user: null,
    currentTeamId: 1,
    isBootstrapped: true,
  });
});

describe("NotificationsPage", () => {
  it("renders notifications and marks one read", async () => {
    let marked = false;
    server.use(
      http.get(`${BASE}/notifications`, () =>
        HttpResponse.json({
          success: true,
          data: {
            unreadCount: marked ? 0 : 1,
            notifications: [
              {
                id: 1,
                userId: 1,
                createdBy: 2,
                createdByName: "alice",
                createdByNickname: "Alice",
                taskId: 9,
                type: "task_assigned",
                content: "你被指派了任務",
                isRead: marked,
                createdAt: 0,
              },
            ],
          },
        }),
      ),
      http.post(`${BASE}/notifications/1/read`, () => {
        marked = true;
        return HttpResponse.json({ success: true, data: { message: "已標記為已讀" } });
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(<NotificationsPage />);
    expect(await screen.findByText("你被指派了任務")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "標記已讀" }));

    await waitFor(() => expect(marked).toBe(true));
  });

  it("shows empty state", async () => {
    server.use(
      http.get(`${BASE}/notifications`, () =>
        HttpResponse.json({ success: true, data: { unreadCount: 0, notifications: [] } }),
      ),
    );

    renderWithProviders(<NotificationsPage />);

    expect(await screen.findByText("目前沒有通知")).toBeInTheDocument();
  });
});
