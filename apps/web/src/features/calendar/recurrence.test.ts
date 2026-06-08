import { describe, expect, it } from "vitest";
import type { TaskResponse } from "@ftm/shared";
import { expandRecurringTasks, shouldShowRecurringTask } from "./recurrence";

const baseTask: TaskResponse = {
  id: 1,
  teamId: 1,
  title: "倒垃圾",
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
  dueDate: null,
  taskType: "recurring",
  recurrenceConfig: { frequency: "weekly", days: [1, 3] },
  parentTaskId: null,
  completedAt: null,
  createdAt: 0,
  updatedAt: 0,
};

describe("recurrence", () => {
  it("matches recurrence config by date", () => {
    expect(shouldShowRecurringTask(new Date(2026, 5, 8), { frequency: "weekly", days: [1] })).toBe(true);
    expect(shouldShowRecurringTask(new Date(2026, 5, 9), { frequency: "weekly", days: [1] })).toBe(false);
    expect(shouldShowRecurringTask(new Date(2026, 5, 9), { frequency: "monthly", dates: [9] })).toBe(true);
    expect(shouldShowRecurringTask(new Date(2026, 5, 9), { frequency: "yearly", month: 6, date: 9 })).toBe(true);
  });

  it("expands recurring tasks into virtual instances", () => {
    const instances = expandRecurringTasks([baseTask], new Date(2026, 5, 8), new Date(2026, 5, 14));

    expect(instances.map((t) => t.dueDate)).toEqual(["2026-06-08", "2026-06-10"]);
    expect(instances[0]?.isRecurringInstance).toBe(true);
  });
});
