import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
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

  it("shows validation error when title is empty", async () => {
    const user = userEvent.setup();

    renderWithProviders(<TaskFormDialog open onOpenChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: "建立" }));

    expect(await screen.findByText("標題不能為空")).toBeInTheDocument();
  });
});
