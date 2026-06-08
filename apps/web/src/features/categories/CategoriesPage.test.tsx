import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { CategoriesPage } from "./CategoriesPage";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({
    accessToken: "tok",
    user: null,
    currentTeamId: 1,
    isBootstrapped: true,
  });
});

describe("CategoriesPage", () => {
  it("renders and creates categories", async () => {
    let created = false;
    server.use(
      http.get(`${BASE}/categories`, () =>
        HttpResponse.json({
          success: true,
          data: created
            ? [
                { id: 1, teamId: 1, name: "家務", color: "#3B82F6", creatorId: 1, createdAt: 0 },
                { id: 2, teamId: 1, name: "工作", color: "#22C55E", creatorId: 1, createdAt: 0 },
              ]
            : [{ id: 1, teamId: 1, name: "家務", color: "#3B82F6", creatorId: 1, createdAt: 0 }],
        }),
      ),
      http.post(`${BASE}/categories`, async ({ request: req }) => {
        const body = (await req.json()) as { name: string };
        expect(body.name).toBe("工作");
        created = true;
        return HttpResponse.json(
          { success: true, data: { id: 2, teamId: 1, name: "工作", color: "#22C55E", creatorId: 1, createdAt: 0 } },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(<CategoriesPage />);
    expect(await screen.findByText("家務")).toBeInTheDocument();

    await user.type(screen.getByLabelText("分類名稱"), "工作");
    await user.click(screen.getByRole("button", { name: "新增分類" }));

    expect(await screen.findByText("工作")).toBeInTheDocument();
  });

  it("shows empty state", async () => {
    server.use(
      http.get(`${BASE}/categories`, () => HttpResponse.json({ success: true, data: [] })),
    );

    renderWithProviders(<CategoriesPage />);

    expect(await screen.findByText("目前沒有分類")).toBeInTheDocument();
  });
});
