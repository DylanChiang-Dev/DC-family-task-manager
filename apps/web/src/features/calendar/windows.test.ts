import { describe, it, expect } from "vitest";
import { getWindowTasks, windowState, getWeekSpans } from "./windows";
import type { TaskResponse } from "@ftm/shared";

function mk(p: Partial<TaskResponse>): TaskResponse {
  return {
    id: 1, teamId: 1, title: "t", description: null, creatorId: 1, creatorNickname: "",
    assigneeId: null, assigneeNickname: null, categoryId: null, categoryName: null,
    categoryColor: null, priority: "medium", status: "pending", dueDate: null,
    taskType: "normal", recurrenceConfig: null, parentTaskId: null, projectId: null, projectStats: null,
    startDate: null, endDate: null, progress: 0, isBacklog: false,
    completedAt: null, createdAt: 0, updatedAt: 0, ...p,
  };
}

describe("getWindowTasks", () => {
  it("keeps only non-backlog window tasks with both dates (projects excluded)", () => {
    const out = getWindowTasks([
      mk({ id: 1, taskType: "window", startDate: "2026-06-10", endDate: "2026-06-20" }),
      mk({ id: 2, taskType: "window", startDate: null, endDate: "2026-06-20" }),
      mk({ id: 3, taskType: "window", startDate: "2026-06-10", endDate: "2026-06-20", isBacklog: true }),
      mk({ id: 4, taskType: "normal" }),
      mk({ id: 5, taskType: "project", startDate: "2026-06-11", endDate: "2026-07-11" }),
    ]);
    expect(out.map((t) => t.id)).toEqual([1]);
  });
});

describe("windowState", () => {
  const w = mk({ taskType: "window", startDate: "2026-06-10", endDate: "2026-06-20", status: "pending" });
  it("upcoming before start", () => {
    expect(windowState(w, "2026-06-09")).toBe("upcoming");
  });
  it("active within range", () => {
    expect(windowState(w, "2026-06-15")).toBe("active");
  });
  it("overdue after end when not done", () => {
    expect(windowState(w, "2026-06-21")).toBe("overdue");
  });
  it("done when completed regardless of date", () => {
    expect(windowState({ ...w, status: "completed" }, "2026-06-21")).toBe("done");
  });
});

describe("getWeekSpans", () => {
  const weekCells = [
    "2026-06-07", "2026-06-08", "2026-06-09", "2026-06-10",
    "2026-06-11", "2026-06-12", "2026-06-13",
  ].map((key) => ({ key }));

  it("clips a window to the week and reports columns", () => {
    const items = [{ id: 1, startDate: "2026-06-09", endDate: "2026-06-11" }];
    const spans = getWeekSpans(weekCells, items);
    expect(spans).toEqual([{ item: items[0], colStart: 2, colEnd: 4 }]);
  });

  it("clamps overflow to week boundaries", () => {
    const items = [{ id: 2, startDate: "2026-06-01", endDate: "2026-06-30" }];
    const spans = getWeekSpans(weekCells, items);
    expect(spans).toEqual([{ item: items[0], colStart: 0, colEnd: 6 }]);
  });

  it("excludes items outside the week", () => {
    const items = [{ id: 3, startDate: "2026-07-01", endDate: "2026-07-05" }];
    expect(getWeekSpans(weekCells, items)).toEqual([]);
  });
});
