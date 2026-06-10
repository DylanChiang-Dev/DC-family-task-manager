import { describe, it, expect } from "vitest";
import { computeOccurrences, nextOccurrenceAfter } from "./recurring";

describe("computeOccurrences — interval", () => {
  it("steps every 10 weeks from anchor", () => {
    const occ = computeOccurrences(
      { mode: "interval", every: 10, unit: "week", anchorDate: "2026-06-10" },
      "2026-06-10",
      "2026-12-31",
    );
    expect(occ).toEqual(["2026-06-10", "2026-08-19", "2026-10-28"]);
  });

  it("excludes occurrences before `from`", () => {
    const occ = computeOccurrences(
      { mode: "interval", every: 1, unit: "month", anchorDate: "2026-01-15" },
      "2026-03-01",
      "2026-05-31",
    );
    expect(occ).toEqual(["2026-03-15", "2026-04-15", "2026-05-15"]);
  });

  it("clamps month overflow to last day of month", () => {
    const occ = computeOccurrences(
      { mode: "interval", every: 1, unit: "month", anchorDate: "2026-01-31" },
      "2026-01-31",
      "2026-03-31",
    );
    // 2/31 不存在 → 2/28；3/31 存在
    expect(occ).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });

  it("handles every 5 years", () => {
    const occ = computeOccurrences(
      { mode: "interval", every: 5, unit: "year", anchorDate: "2026-06-10" },
      "2026-01-01",
      "2040-12-31",
    );
    expect(occ).toEqual(["2026-06-10", "2031-06-10", "2036-06-10"]);
  });
});

describe("computeOccurrences — anchored", () => {
  it("weekly weekdays", () => {
    const occ = computeOccurrences(
      { mode: "anchored", unit: "week", weekdays: [1, 3] }, // 一、三
      "2026-06-08", // 週一
      "2026-06-14",
    );
    expect(occ).toEqual(["2026-06-08", "2026-06-10"]);
  });

  it("monthly dates with clamp + dedupe", () => {
    const occ = computeOccurrences(
      { mode: "anchored", unit: "month", dates: [15, 31] },
      "2026-02-01",
      "2026-03-31",
    );
    // 2 月：15、28(31→clamp)；3 月：15、31
    expect(occ).toEqual(["2026-02-15", "2026-02-28", "2026-03-15", "2026-03-31"]);
  });

  it("yearly month/date", () => {
    const occ = computeOccurrences(
      { mode: "anchored", unit: "year", month: 5, date: 31 },
      "2025-01-01",
      "2027-12-31",
    );
    expect(occ).toEqual(["2025-05-31", "2026-05-31", "2027-05-31"]);
  });
});

describe("nextOccurrenceAfter", () => {
  it("interval: returns first occurrence >= from even far in future", () => {
    const next = nextOccurrenceAfter(
      { mode: "interval", every: 5, unit: "year", anchorDate: "2026-06-10" },
      "2032-01-01",
    );
    expect(next).toBe("2036-06-10");
  });

  it("interval: returns `from`-day when it lands exactly on an occurrence", () => {
    const next = nextOccurrenceAfter(
      { mode: "interval", every: 1, unit: "month", anchorDate: "2026-01-10" },
      "2026-03-10",
    );
    expect(next).toBe("2026-03-10");
  });

  it("anchored monthly: next matching date", () => {
    const next = nextOccurrenceAfter(
      { mode: "anchored", unit: "month", dates: [1, 15] },
      "2026-06-10",
    );
    expect(next).toBe("2026-06-15");
  });

  it("anchored yearly: rolls to next year when past", () => {
    const next = nextOccurrenceAfter(
      { mode: "anchored", unit: "year", month: 5, date: 31 },
      "2026-06-10",
    );
    expect(next).toBe("2027-05-31");
  });
});
