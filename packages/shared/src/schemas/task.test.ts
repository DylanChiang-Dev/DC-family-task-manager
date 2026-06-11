import { describe, it, expect } from "vitest";
import { createTaskSchema, updateTaskSchema } from "./task";

const base = { title: "x" };

describe("createTaskSchema validation", () => {
  it("recurring template requires recurrenceConfig", () => {
    const r = createTaskSchema.safeParse({ ...base, taskType: "recurring" });
    expect(r.success).toBe(false);
  });

  it("recurring with config passes", () => {
    const r = createTaskSchema.safeParse({
      ...base,
      taskType: "recurring",
      recurrenceConfig: { mode: "interval", every: 2, unit: "week", anchorDate: "2026-06-10" },
    });
    expect(r.success).toBe(true);
  });

  it("window requires start/end and rejects start > end", () => {
    const ok = createTaskSchema.safeParse({
      ...base,
      taskType: "window",
      startDate: "2026-06-10",
      endDate: "2026-06-20",
    });
    expect(ok.success).toBe(true);

    const bad = createTaskSchema.safeParse({
      ...base,
      taskType: "window",
      startDate: "2026-06-20",
      endDate: "2026-06-10", // start > end
    });
    expect(bad.success).toBe(false);
  });

  it("window rejects recurrenceConfig", () => {
    const r = createTaskSchema.safeParse({
      ...base,
      taskType: "window",
      startDate: "2026-06-10",
      endDate: "2026-06-20",
      recurrenceConfig: { mode: "interval", every: 1, unit: "day", anchorDate: "2026-06-10" },
    });
    expect(r.success).toBe(false);
  });

  it("backlog skips time-field requirements", () => {
    const r = createTaskSchema.safeParse({ ...base, isBacklog: true, taskType: "normal" });
    expect(r.success).toBe(true);
  });

  it("progress only allowed for window", () => {
    const r = createTaskSchema.safeParse({ ...base, taskType: "normal", progress: 50 });
    expect(r.success).toBe(false);
  });

  it("recurring instance (parentTaskId set) does not require recurrenceConfig", () => {
    const r = createTaskSchema.safeParse({ ...base, taskType: "recurring", parentTaskId: 7 });
    expect(r.success).toBe(true);
  });
});

describe("updateTaskSchema validation", () => {
  it("progress-only update passes without taskType (route checks against existing type)", () => {
    const r = updateTaskSchema.safeParse({ progress: 60 });
    expect(r.success).toBe(true);
  });

  it("status-only update passes", () => {
    const r = updateTaskSchema.safeParse({ status: "completed" });
    expect(r.success).toBe(true);
  });

  it("nonzero progress with explicit non-window type rejected", () => {
    const r = updateTaskSchema.safeParse({ taskType: "normal", progress: 60 });
    expect(r.success).toBe(false);
  });
});

describe("project task type", () => {
  it("project type with start/end passes", () => {
    const r = createTaskSchema.safeParse({
      ...base,
      taskType: "project",
      startDate: "2026-06-01",
      endDate: "2026-12-31",
    });
    expect(r.success).toBe(true);
  });

  it("project rejects projectId (no nesting)", () => {
    const r = createTaskSchema.safeParse({ ...base, taskType: "project", projectId: 3 });
    expect(r.success).toBe(false);
  });

  it("project rejects parentTaskId", () => {
    const r = createTaskSchema.safeParse({ ...base, taskType: "project", parentTaskId: 3 });
    expect(r.success).toBe(false);
  });

  it("project rejects start > end", () => {
    const r = createTaskSchema.safeParse({
      ...base,
      taskType: "project",
      startDate: "2026-12-31",
      endDate: "2026-06-01",
    });
    expect(r.success).toBe(false);
  });

  it("project rejects nonzero progress", () => {
    const r = createTaskSchema.safeParse({ ...base, taskType: "project", progress: 50 });
    expect(r.success).toBe(false);
  });

  it("normal task accepts projectId", () => {
    const r = createTaskSchema.safeParse({ ...base, taskType: "normal", projectId: 3 });
    expect(r.success).toBe(true);
  });

  it("recurring template accepts projectId", () => {
    const r = createTaskSchema.safeParse({
      ...base,
      taskType: "recurring",
      projectId: 3,
      recurrenceConfig: { mode: "interval", every: 1, unit: "day", anchorDate: "2026-06-11" },
    });
    expect(r.success).toBe(true);
  });
});
