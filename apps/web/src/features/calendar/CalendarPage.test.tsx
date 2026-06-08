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

    expect(await screen.findByText("繳水費")).toBeInTheDocument();
  });
});
