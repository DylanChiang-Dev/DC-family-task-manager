import { describe, it, expect } from "vitest";
import { createTaskSchema } from "./task";

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
});
