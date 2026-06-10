import { describe, it, expect } from "vitest";
import { filterBacklog } from "./hooks";
import type { TaskResponse } from "@ftm/shared";

function mk(p: Partial<TaskResponse>): TaskResponse {
  return {
    id: 1, teamId: 1, title: "t", description: null, creatorId: 1, creatorNickname: "",
    assigneeId: null, assigneeNickname: null, categoryId: null, categoryName: null,
    categoryColor: null, priority: "medium", status: "pending", dueDate: null,
    taskType: "normal", recurrenceConfig: null, parentTaskId: null,
    startDate: null, endDate: null, progress: 0, isBacklog: false,
    completedAt: null, createdAt: 0, updatedAt: 0, ...p,
  };
}

describe("filterBacklog", () => {
  it("keeps only isBacklog tasks", () => {
    const out = filterBacklog([
      mk({ id: 1, isBacklog: true }),
      mk({ id: 2, isBacklog: false }),
      mk({ id: 3, isBacklog: true }),
    ]);
    expect(out.map((t) => t.id)).toEqual([1, 3]);
  });

  it("returns empty for undefined input", () => {
    expect(filterBacklog(undefined)).toEqual([]);
  });
});
