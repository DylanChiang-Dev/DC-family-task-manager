import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { ScheduleBlockDialog } from "./ScheduleBlockDialog";

const BASE = "http://localhost:8787/api";

describe("ScheduleBlockDialog", () => {
  it("creates a schedule block with selected date defaults", async () => {
    let posted: unknown = null;
    server.use(
      http.post(`${BASE}/schedule-blocks`, async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json({ success: true, data: { id: 1 } }, { status: 201 });
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(
      <ScheduleBlockDialog open defaultDate="2026-06-10" onOpenChange={() => {}} />,
    );

    await user.type(screen.getByLabelText("標題"), "廣州出差");
    await user.type(screen.getByLabelText("地點"), "廣州");
    await user.click(screen.getByRole("button", { name: "#22C55E" }));
    await user.click(screen.getByRole("button", { name: "新增行程" }));

    await waitFor(() =>
      expect(posted).toMatchObject({
        title: "廣州出差",
        location: "廣州",
        startDate: "2026-06-10",
        endDate: "2026-06-10",
        color: "#22C55E",
      }),
    );
  });

  it("edits an existing schedule block", async () => {
    let patched: unknown = null;
    server.use(
      http.patch(`${BASE}/schedule-blocks/7`, async ({ request }) => {
        patched = await request.json();
        return HttpResponse.json({ success: true, data: { id: 7 } });
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(
      <ScheduleBlockDialog
        open
        defaultDate="2026-06-15"
        onOpenChange={() => {}}
        block={{
          id: 7,
          userId: 1,
          title: "深圳",
          location: "深圳",
          startDate: "2026-06-15",
          endDate: "2026-06-17",
          color: "#22C55E",
          note: null,
          createdAt: 0,
          updatedAt: 0,
        }}
      />,
    );

    await user.clear(screen.getByLabelText("標題"));
    await user.type(screen.getByLabelText("標題"), "深圳更新");
    await user.click(screen.getByRole("button", { name: "儲存行程" }));

    await waitFor(() => expect(patched).toMatchObject({ title: "深圳更新" }));
  });

  it("shows validation when end date is before start date", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ScheduleBlockDialog open defaultDate="2026-06-10" onOpenChange={() => {}} />,
    );

    await user.type(screen.getByLabelText("標題"), "錯誤日期");
    await user.clear(screen.getByLabelText("結束日期"));
    await user.type(screen.getByLabelText("結束日期"), "2026-06-09");
    await user.click(screen.getByRole("button", { name: "新增行程" }));

    expect(await screen.findByText("結束日期不能早於開始日期")).toBeInTheDocument();
  });
});
