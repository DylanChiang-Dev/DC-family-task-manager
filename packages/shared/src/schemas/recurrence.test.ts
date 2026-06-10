import { describe, it, expect } from "vitest";
import { recurrenceConfigSchema } from "./recurrence";

describe("recurrenceConfigSchema", () => {
  it("accepts interval mode", () => {
    const r = recurrenceConfigSchema.safeParse({
      mode: "interval",
      every: 10,
      unit: "week",
      anchorDate: "2026-06-10",
    });
    expect(r.success).toBe(true);
  });

  it("accepts anchored weekly", () => {
    const r = recurrenceConfigSchema.safeParse({
      mode: "anchored",
      unit: "week",
      weekdays: [1, 3, 5],
    });
    expect(r.success).toBe(true);
  });

  it("accepts anchored monthly", () => {
    const r = recurrenceConfigSchema.safeParse({
      mode: "anchored",
      unit: "month",
      dates: [1, 15],
    });
    expect(r.success).toBe(true);
  });

  it("accepts anchored yearly", () => {
    const r = recurrenceConfigSchema.safeParse({
      mode: "anchored",
      unit: "year",
      month: 5,
      date: 31,
    });
    expect(r.success).toBe(true);
  });

  it("rejects interval with every < 1", () => {
    const r = recurrenceConfigSchema.safeParse({
      mode: "interval",
      every: 0,
      unit: "day",
      anchorDate: "2026-06-10",
    });
    expect(r.success).toBe(false);
  });

  it("rejects anchored weekly without weekdays", () => {
    const r = recurrenceConfigSchema.safeParse({
      mode: "anchored",
      unit: "week",
      weekdays: [],
    });
    expect(r.success).toBe(false);
  });
});
