import { describe, it, expect } from "vitest";
import { toCalendarTasks } from "./recurrence";
import type { TaskResponse } from "@ftm/shared";

function mk(partial: Partial<TaskResponse>): TaskResponse {
  return {
    id: 1, teamId: 1, title: "t", description: null, creatorId: 1, creatorNickname: "",
    assigneeId: null, assigneeNickname: null, categoryId: null, categoryName: null,
    categoryColor: null, priority: "medium", status: "pending", dueDate: null,
    taskType: "normal", recurrenceConfig: null, parentTaskId: null,
    startDate: null, endDate: null, progress: 0, isBacklog: false,
    completedAt: null, createdAt: 0, updatedAt: 0, ...partial,
  };
}

describe("toCalendarTasks", () => {
  it("drops recurring templates (no parent)", () => {
    const out = toCalendarTasks([
      mk({ id: 1, taskType: "recurring", parentTaskId: null, dueDate: null }),
    ]);
    expect(out).toHaveLength(0);
  });

  it("keeps recurring instances and marks them", () => {
    const out = toCalendarTasks([
      mk({ id: 2, taskType: "recurring", parentTaskId: 1, dueDate: "2026-06-10" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.isRecurringInstance).toBe(true);
  });

  it("keeps normal dated tasks, drops undated", () => {
    const out = toCalendarTasks([
      mk({ id: 3, dueDate: "2026-06-11" }),
      mk({ id: 4, dueDate: null }),
    ]);
    expect(out.map((t) => t.id)).toEqual([3]);
  });
});
