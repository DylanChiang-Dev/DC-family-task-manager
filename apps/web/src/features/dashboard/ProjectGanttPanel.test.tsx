import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import type { TaskResponse } from "@ftm/shared";
import { renderWithProviders } from "@/test/test-utils";
import { ganttGeometry, selectGanttProjects, ProjectGanttPanel } from "./ProjectGanttPanel";

function mk(p: Partial<TaskResponse>): TaskResponse {
  return {
    id: 1, teamId: 1, title: "t", description: null, creatorId: 1, creatorNickname: "",
    assigneeId: null, assigneeNickname: null, categoryId: null, categoryName: null,
    categoryColor: null, priority: "medium", status: "pending", dueDate: null,
    taskType: "project", recurrenceConfig: null, parentTaskId: null, projectId: null,
    projectStats: { total: 20, completed: 8, progress: 40 },
    startDate: "2026-06-11", endDate: "2026-07-11", progress: 0, isBacklog: false,
    completedAt: null, createdAt: 0, updatedAt: 0, ...p,
  };
}

describe("ganttGeometry", () => {
  // 窗口 2026-06-11 起共 42 天（至 7/22）
  it("maps an in-range project to left/width percentages", () => {
    const g = ganttGeometry("2026-06-11", "2026-06-11", "2026-07-11");
    expect(g.overLeft).toBe(false);
    expect(g.overRight).toBe(false);
    expect(g.leftPct).toBeCloseTo(0);
    // 6/11..7/11 = 31 天 → 31/42
    expect(g.widthPct).toBeCloseTo((31 / 42) * 100, 5);
  });

  it("clamps a project starting before the window and flags overLeft", () => {
    const g = ganttGeometry("2026-06-11", "2026-06-01", "2026-06-20");
    expect(g.overLeft).toBe(true);
    expect(g.leftPct).toBeCloseTo(0);
    // 6/11..6/20 = 10 天
    expect(g.widthPct).toBeCloseTo((10 / 42) * 100, 5);
  });

  it("clamps a project ending after the window and flags overRight", () => {
    const g = ganttGeometry("2026-06-11", "2026-07-01", "2026-08-30");
    expect(g.overRight).toBe(true);
    // 7/1 是第 20 格（0-based）→ left 20/42；7/1..7/22 = 22 天
    expect(g.leftPct).toBeCloseTo((20 / 42) * 100, 5);
    expect(g.widthPct).toBeCloseTo((22 / 42) * 100, 5);
  });
});

describe("selectGanttProjects", () => {
  it("keeps active in-window projects, drops others", () => {
    const out = selectGanttProjects(
      [
        mk({ id: 1 }),
        mk({ id: 2, taskType: "normal" }),
        mk({ id: 3, status: "completed" }),
        mk({ id: 4, status: "cancelled" }),
        mk({ id: 5, isBacklog: true }),
        mk({ id: 6, startDate: null }),
        mk({ id: 7, startDate: "2026-01-01", endDate: "2026-02-01" }), // 窗口前已結束
        mk({ id: 8, startDate: "2026-06-01", endDate: "2026-08-30" }), // 兩端超出但重疊
      ],
      "2026-06-11",
    );
    expect(out.map((t) => t.id)).toEqual([1, 8]);
  });
});

describe("ProjectGanttPanel", () => {
  const start = new Date("2026-06-11T00:00:00");

  it("renders bars with title, progress and link", () => {
    renderWithProviders(
      <ProjectGanttPanel tasks={[mk({ id: 4, title: "寫書" })]} start={start} todayKey="2026-06-11" />,
    );

    expect(screen.getByText("進行中項目")).toBeInTheDocument();
    expect(screen.getByText(/寫書 · 40%（8\/20 任務）/)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/tasks/4");
    expect(screen.getByTestId("gantt-today-line")).toBeInTheDocument();
  });

  it("marks out-of-range projects with arrows", () => {
    renderWithProviders(
      <ProjectGanttPanel
        tasks={[mk({ id: 5, title: "學鋼琴", startDate: "2026-06-01", endDate: "2026-08-30", projectStats: { total: 20, completed: 3, progress: 15 } })]}
        start={start}
        todayKey="2026-06-11"
      />,
    );

    expect(screen.getByText(/←/)).toBeInTheDocument();
    expect(screen.getByText(/→ 8\/30/)).toBeInTheDocument();
  });

  it("renders nothing when no active projects", () => {
    const { container } = renderWithProviders(
      <ProjectGanttPanel tasks={[mk({ id: 3, status: "completed" })]} start={start} todayKey="2026-06-11" />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
