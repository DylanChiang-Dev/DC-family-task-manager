# Plan 1 — 基礎 ＋ 重複引擎 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把任務類型從 `normal/recurring/repeatable` 改為 `normal/recurring/window`，重做重複任務：任意間隔（interval）與對齊特定日（anchored）兩種配置，後端 cron eager 產生真實實例 row（近 3 年窗 ＋ 保底至少 1 筆），前端退場「渲染時虛擬展開」。

**Architecture:** 純函式日期引擎放在 `@ftm/shared`（可單元測試）；`apps/api` 的產生服務是薄薄的 DB glue，由 cron 與「建立重複任務」即時觸發；前端改為直接渲染後端產生的真實實例 row。本計畫同時一次性加入後續 Plan 2（window）與 Plan 3（backlog）需要的 DB 欄位，避免多次遷移（遵守「先 `db:migrate:remote` 再 deploy」鐵律）。

**Tech Stack:** TypeScript、Zod、Drizzle ORM（D1/SQLite）、Hono、Cloudflare Workers cron、React、React Query、Vitest + Testing Library + MSW。

**本計畫的測試策略：**
- `@ftm/shared`：新增 vitest，單元測試純日期引擎與 Zod 校驗。
- `@ftm/web`：沿用既有 vitest + MSW，測表單與日曆映射。
- `apps/api`：專案慣例無自動化測試，產生服務以「本地 dev ＋ curl/手動」驗證（步驟內附指令）。

---

## File Structure

**`packages/shared/src`**
- Modify `constants/enums.ts` — `TASK_TYPE` 改為 `["normal","recurring","window"]`；新增 `RECURRENCE_UNIT`；移除 `RECURRENCE_FREQ`（不再使用）。
- Rewrite `schemas/recurrence.ts` — 新的 `recurrenceConfigSchema`（interval / anchored union）。
- Rewrite `lib/recurring.ts` — 移除 `shouldShowRecurringTask`，新增日期引擎 `computeOccurrences` / `nextOccurrenceAfter`。
- Modify `schemas/task.ts` — `superRefine` 改為依新類型/配置校驗。
- Create `lib/recurring.test.ts`、`schemas/task.test.ts` — 引擎與校驗測試。
- Create `vitest.config.ts`、修改 `package.json` — 加 vitest。

**`apps/api/src`**
- Modify `db/schema.ts` — tasks 表新增 `startDate`、`endDate`、`progress`、`isBacklog` 欄位。
- Create `db/migrations/0003_*.sql` — 由 `db:generate` 產生。
- Create `services/recurrence.ts` — `generateInstancesForTemplate`、`generateAllRecurringInstances`。
- Modify `services/reminder.ts` — 移除 recurring 特殊分支，實例走到期路徑。
- Modify `index.ts` — `scheduled` 內加掛產生服務。
- Modify `routes/task.ts` — 建立重複模板時即時產生；PATCH/DELETE 系列時處理未來未完成實例。

**`apps/web/src`**
- Rewrite `features/calendar/recurrence.ts` — 移除虛擬展開，改為 `toCalendarTasks`（濾掉模板、標記實例）。
- Modify `features/dashboard/DashboardPage.tsx`、`features/calendar/CalendarPage.tsx` — 改用 `toCalendarTasks`。
- Modify `features/tasks/TaskFormDialog.tsx` — 重複 UI 改 interval/anchored；類型選單移除「可重複」。
- Modify 既有測試 `features/tasks/TaskFormDialog.test.tsx` — 對齊新 UI 與 payload。

---

## Task 1: Shared 枚舉與 DB 欄位基礎

把類型枚舉改名、加入後續所有計畫需要的欄位。先做純常量改動，下一個任務再處理依賴它的 schema。

**Files:**
- Modify: `packages/shared/src/constants/enums.ts:12`、`:32-37`、`:45`
- Modify: `apps/api/src/db/schema.ts:133-150`

- [ ] **Step 1: 改 `TASK_TYPE`、移除 `RECURRENCE_FREQ`、新增 `RECURRENCE_UNIT`**

在 `packages/shared/src/constants/enums.ts`：

把第 12 行
```ts
export const TASK_TYPE = ["normal", "recurring", "repeatable"] as const;
```
改為
```ts
export const TASK_TYPE = ["normal", "recurring", "window"] as const;
```

把第 32-37 行
```ts
export const RECURRENCE_FREQ = [
  "daily",
  "weekly",
  "monthly",
  "yearly",
] as const;
```
改為
```ts
export const RECURRENCE_UNIT = ["day", "week", "month", "year"] as const;
```

把第 45 行
```ts
export type RecurrenceFreq = (typeof RECURRENCE_FREQ)[number];
```
改為
```ts
export type RecurrenceUnit = (typeof RECURRENCE_UNIT)[number];
```

- [ ] **Step 2: 在 tasks 表新增 4 個欄位**

在 `apps/api/src/db/schema.ts`，把 tasks 表的 `parentTaskId` 那行（約 140 行）之後、`completedAt` 之前插入新欄位。改動後該區塊為：

```ts
    parentTaskId: integer("parent_task_id"),
    // window 類型：區間 + 進度
    startDate: text("start_date"),
    endDate: text("end_date"),
    progress: integer("progress").notNull().default(0),
    // 靈感箱旗標（與類型正交）
    isBacklog: integer("is_backlog", { mode: "boolean" }).notNull().default(false),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
```

並在表定義末端的 index 區塊（約 144-150 行）新增一個 backlog 索引，改為：

```ts
  (t) => ({
    teamStatusIdx: index("idx_team_status").on(t.teamId, t.status),
    assigneeIdx: index("idx_assignee").on(t.assigneeId),
    dueDateIdx: index("idx_due_date").on(t.dueDate),
    taskTypeIdx: index("idx_task_type").on(t.taskType),
    parentIdx: index("idx_parent").on(t.parentTaskId),
    backlogIdx: index("idx_team_backlog").on(t.teamId, t.isBacklog),
  }),
```

- [ ] **Step 3: 產生遷移**

Run: `pnpm --filter @ftm/api db:generate`
Expected: 在 `apps/api/src/db/migrations/` 生成 `0003_*.sql`，內容包含 4 條 `ALTER TABLE tasks ADD COLUMN`（start_date、end_date、progress、is_backlog）與 `CREATE INDEX idx_team_backlog`。`task_type` 為純 text 欄位、drizzle enum 不產生 DB CHECK，故改名 `window` 不需 DDL。

- [ ] **Step 4: 套用到本地 D1**

Run: `pnpm --filter @ftm/api db:migrate:local`
Expected: 顯示套用 `0003_*` 成功，無錯誤。

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/constants/enums.ts apps/api/src/db/schema.ts apps/api/src/db/migrations
git commit -m "feat(shared,api): rename task type to window, add window/backlog columns"
```

---

## Task 2: 為 shared 加上 vitest

純日期引擎需要單元測試，但 `packages/shared` 目前只有 `typecheck`。加一個最小 vitest。

**Files:**
- Modify: `packages/shared/package.json`
- Create: `packages/shared/vitest.config.ts`

- [ ] **Step 1: 安裝 vitest 到 shared**

Run: `pnpm --filter @ftm/shared add -D vitest`
Expected: `package.json` 的 devDependencies 出現 `vitest`。

- [ ] **Step 2: 加 test script**

在 `packages/shared/package.json` 的 `scripts` 區塊改為：
```json
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

- [ ] **Step 3: 建立 vitest 設定**

Create `packages/shared/vitest.config.ts`：
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: 冒煙測試確認 runner 可用**

Create `packages/shared/src/smoke.test.ts`：
```ts
import { describe, it, expect } from "vitest";

describe("vitest wiring", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `pnpm --filter @ftm/shared test`
Expected: 1 passed。

- [ ] **Step 5: 刪除冒煙檔並提交**

```bash
rm packages/shared/src/smoke.test.ts
git add packages/shared/package.json packages/shared/vitest.config.ts pnpm-lock.yaml
git commit -m "test(shared): add vitest runner"
```

---

## Task 3: 重做 `recurrenceConfigSchema`

新配置：`interval`（每 N 個單位，從 anchorDate 起算）與 `anchored`（對齊週幾/月幾號/年某月某日）。

**Files:**
- Rewrite: `packages/shared/src/schemas/recurrence.ts`
- Test: `packages/shared/src/schemas/recurrence.test.ts`

- [ ] **Step 1: 寫失敗測試**

Create `packages/shared/src/schemas/recurrence.test.ts`：
```ts
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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter @ftm/shared test recurrence`
Expected: FAIL（舊 schema 用 `frequency`，新欄位都不符）。

- [ ] **Step 3: 重寫 schema**

Replace 整個 `packages/shared/src/schemas/recurrence.ts`：
```ts
import { z } from "zod";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 每 N 個單位重複，從 anchorDate 起算 */
const intervalSchema = z.object({
  mode: z.literal("interval"),
  every: z.number().int().min(1).max(999),
  unit: z.enum(["day", "week", "month", "year"]),
  anchorDate: z.string().regex(ISO_DATE, "日期格式必須為 YYYY-MM-DD"),
});

/** 對齊特定週幾 */
const anchoredWeekSchema = z.object({
  mode: z.literal("anchored"),
  unit: z.literal("week"),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1), // 0=日
});

/** 對齊每月特定幾號 */
const anchoredMonthSchema = z.object({
  mode: z.literal("anchored"),
  unit: z.literal("month"),
  dates: z.array(z.number().int().min(1).max(31)).min(1),
});

/** 對齊每年特定月日 */
const anchoredYearSchema = z.object({
  mode: z.literal("anchored"),
  unit: z.literal("year"),
  month: z.number().int().min(1).max(12),
  date: z.number().int().min(1).max(31),
});

// 注意：3 個 anchored 變體共用 mode="anchored"，無法用 discriminatedUnion("mode")，
// 故用 z.union。
export const recurrenceConfigSchema = z.union([
  intervalSchema,
  anchoredWeekSchema,
  anchoredMonthSchema,
  anchoredYearSchema,
]);

export type RecurrenceConfig = z.infer<typeof recurrenceConfigSchema>;
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm --filter @ftm/shared test recurrence`
Expected: 6 passed。

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/schemas/recurrence.ts packages/shared/src/schemas/recurrence.test.ts
git commit -m "feat(shared): redesign recurrenceConfig as interval/anchored"
```

---

## Task 4: 日期引擎 — `computeOccurrences`

給定配置與 `[from, to]` 區間，回傳所有發生日期（ISO 字串、升序、去重）。用 UTC 算術避免 DST。

**Files:**
- Rewrite: `packages/shared/src/lib/recurring.ts`
- Test: `packages/shared/src/lib/recurring.test.ts`

- [ ] **Step 1: 寫失敗測試**

Create `packages/shared/src/lib/recurring.test.ts`：
```ts
import { describe, it, expect } from "vitest";
import { computeOccurrences } from "./recurring";

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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter @ftm/shared test recurring`
Expected: FAIL with "computeOccurrences is not a function"（舊檔只有 `shouldShowRecurringTask`）。

- [ ] **Step 3: 重寫 `lib/recurring.ts`（含內部日期工具）**

Replace 整個 `packages/shared/src/lib/recurring.ts`：
```ts
import type { RecurrenceConfig } from "../schemas/recurrence";

// ── 內部日期工具（全部以「日曆日」為單位，用 UTC 避免 DST）──

interface Ymd {
  y: number;
  m: number; // 1-12
  d: number;
}

function parseISO(iso: string): Ymd {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function toISO({ y, m, d }: Ymd): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** 某年某月（1-12）的最後一天 */
function lastDayOfMonth(y: number, m: number): number {
  // Date.UTC(y, m, 0) → 第 m 月的第 0 天 = 第 m-1 月（0-based）的最後一天 = 第 m 月最後一天
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function clampDay(y: number, m: number, d: number): number {
  return Math.min(d, lastDayOfMonth(y, m));
}

/** ISO 字串轉 UTC 毫秒（僅用於比較大小） */
function isoToMs(iso: string): number {
  const { y, m, d } = parseISO(iso);
  return Date.UTC(y, m - 1, d);
}

/** 從 Ymd 起算，加 n 天（day/week 用） */
function addDays({ y, m, d }: Ymd, n: number): Ymd {
  const ms = Date.UTC(y, m - 1, d) + n * 86400000;
  const dt = new Date(ms);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

/** interval 模式：把 anchor 往前推 step 次（含 0 次=anchor 本身） */
function intervalAt(anchor: Ymd, every: number, unit: string, step: number): Ymd {
  const k = every * step;
  switch (unit) {
    case "day":
      return addDays(anchor, k);
    case "week":
      return addDays(anchor, k * 7);
    case "month": {
      const totalMonths = (anchor.m - 1) + k;
      const y = anchor.y + Math.floor(totalMonths / 12);
      const m = (totalMonths % 12) + 1;
      return { y, m, d: clampDay(y, m, anchor.d) };
    }
    case "year": {
      const y = anchor.y + k;
      return { y, m: anchor.m, d: clampDay(y, anchor.m, anchor.d) };
    }
    default:
      return anchor;
  }
}

const MAX_STEPS = 100000; // runaway 防護

/**
 * 回傳 [fromISO, toISO]（含端點）內所有發生日期，升序、去重。
 */
export function computeOccurrences(
  config: RecurrenceConfig,
  fromISO: string,
  toISO_: string,
): string[] {
  const fromMs = isoToMs(fromISO);
  const toMs = isoToMs(toISO_);
  if (fromMs > toMs) return [];

  if (config.mode === "interval") {
    const anchor = parseISO(config.anchorDate);
    const out: string[] = [];
    for (let step = 0; step < MAX_STEPS; step++) {
      const at = intervalAt(anchor, config.every, config.unit, step);
      const atMs = Date.UTC(at.y, at.m - 1, at.d);
      if (atMs > toMs) break;
      if (atMs >= fromMs) out.push(toISO(at));
    }
    return out;
  }

  // anchored
  const set = new Set<string>();
  const from = parseISO(fromISO);
  const to = parseISO(toISO_);

  if (config.unit === "week") {
    let cursor: Ymd = from;
    while (Date.UTC(cursor.y, cursor.m - 1, cursor.d) <= toMs) {
      const dow = new Date(Date.UTC(cursor.y, cursor.m - 1, cursor.d)).getUTCDay();
      if (config.weekdays.includes(dow)) set.add(toISO(cursor));
      cursor = addDays(cursor, 1);
    }
  } else if (config.unit === "month") {
    for (let y = from.y; y <= to.y; y++) {
      const mStart = y === from.y ? from.m : 1;
      const mEnd = y === to.y ? to.m : 12;
      for (let m = mStart; m <= mEnd; m++) {
        for (const rawD of config.dates) {
          const d = clampDay(y, m, rawD);
          const ms = Date.UTC(y, m - 1, d);
          if (ms >= fromMs && ms <= toMs) set.add(toISO({ y, m, d }));
        }
      }
    }
  } else {
    // year
    for (let y = from.y; y <= to.y; y++) {
      const d = clampDay(y, config.month, config.date);
      const ms = Date.UTC(y, config.month - 1, d);
      if (ms >= fromMs && ms <= toMs) set.add(toISO({ y, m: config.month, d }));
    }
  }

  return [...set].sort();
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm --filter @ftm/shared test recurring`
Expected: 全部 passed（interval 4 + anchored 3）。

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/lib/recurring.ts packages/shared/src/lib/recurring.test.ts
git commit -m "feat(shared): add computeOccurrences date engine"
```

---

## Task 5: 日期引擎 — `nextOccurrenceAfter`（保底用）

當 3 年窗內一筆都算不出（如每 5 年、anchor 很久以前的尾巴），仍要算出「下一筆」。

**Files:**
- Modify: `packages/shared/src/lib/recurring.ts`（append）
- Test: `packages/shared/src/lib/recurring.test.ts`（append）

- [ ] **Step 1: 追加失敗測試**

在 `packages/shared/src/lib/recurring.test.ts` 末端追加：
```ts
import { nextOccurrenceAfter } from "./recurring";

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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter @ftm/shared test recurring`
Expected: FAIL with "nextOccurrenceAfter is not a function"。

- [ ] **Step 3: 實作 `nextOccurrenceAfter`**

在 `packages/shared/src/lib/recurring.ts` 末端追加：
```ts
/**
 * 回傳第一個 >= fromISO 的發生日期；找不到（理論上不會）回傳 null。
 * interval 直接從 anchor 往前步進；anchored 用 400 天窗（足以涵蓋 year）找最早一筆。
 */
export function nextOccurrenceAfter(
  config: RecurrenceConfig,
  fromISO: string,
): string | null {
  const fromMs = isoToMs(fromISO);

  if (config.mode === "interval") {
    const anchor = parseISO(config.anchorDate);
    for (let step = 0; step < MAX_STEPS; step++) {
      const at = intervalAt(anchor, config.every, config.unit, step);
      const atMs = Date.UTC(at.y, at.m - 1, at.d);
      if (atMs >= fromMs) return toISO(at);
    }
    return null;
  }

  // anchored：往後最多 400 天必有一筆（year 最遠 ~366 天）
  const from = parseISO(fromISO);
  const end = addDays(from, 400);
  const occ = computeOccurrences(config, fromISO, toISO(end));
  return occ[0] ?? null;
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm --filter @ftm/shared test recurring`
Expected: 全部 passed（含新增 4 個）。

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/lib/recurring.ts packages/shared/src/lib/recurring.test.ts
git commit -m "feat(shared): add nextOccurrenceAfter for guarantee fallback"
```

---

## Task 6: 更新 task 校驗（`createTaskSchema` / `updateTaskSchema`）

依新類型校驗：`recurring` 模板需 `recurrenceConfig`、不可有區間；`window`（本計畫只先放校驗骨架，UI 在 Plan 2）需 `startDate ≤ endDate`、不可有 `recurrenceConfig`；`isBacklog=true` 跳過時間校驗。

**Files:**
- Rewrite: `packages/shared/src/schemas/task.ts`
- Test: `packages/shared/src/schemas/task.test.ts`

- [ ] **Step 1: 寫失敗測試**

Create `packages/shared/src/schemas/task.test.ts`：
```ts
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

  it("window requires start/end and rejects recurrenceConfig", () => {
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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter @ftm/shared test task`
Expected: FAIL（schema 尚無 startDate/endDate/progress/isBacklog 欄位與新規則）。

- [ ] **Step 3: 重寫 `schemas/task.ts`**

Replace 整個 `packages/shared/src/schemas/task.ts`：
```ts
import { z } from "zod";
import { TASK_PRIORITY, TASK_STATUS, TASK_TYPE } from "../constants/enums";
import { recurrenceConfigSchema } from "./recurrence";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// 共用欄位（create 與 update 各自決定 optional 程度）
const taskFields = {
  description: z.string().trim().max(5000).nullable().optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  priority: z.enum(TASK_PRIORITY),
  status: z.enum(TASK_STATUS),
  dueDate: z.string().regex(ISO_DATE, "日期格式必須為 YYYY-MM-DD").nullable().optional(),
  taskType: z.enum(TASK_TYPE),
  recurrenceConfig: recurrenceConfigSchema.nullable().optional(),
  parentTaskId: z.number().int().positive().nullable().optional(),
  startDate: z.string().regex(ISO_DATE).nullable().optional(),
  endDate: z.string().regex(ISO_DATE).nullable().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  isBacklog: z.boolean().optional(),
};

/**
 * 跨欄位一致性校驗。create 與 update 共用；update 時欄位多半 optional，
 * 故所有檢查都以「該欄位有給值」為前提，未給則略過。
 */
function refineTask(
  data: {
    taskType?: (typeof TASK_TYPE)[number];
    recurrenceConfig?: unknown;
    startDate?: string | null;
    endDate?: string | null;
    progress?: number;
    isBacklog?: boolean;
    parentTaskId?: number | null;
  },
  ctx: z.RefinementCtx,
) {
  const isBacklog = data.isBacklog === true;
  const type = data.taskType;
  const isTemplate = type === "recurring" && data.parentTaskId == null;

  // progress 僅 window 可非 0
  if (data.progress != null && data.progress !== 0 && type !== "window") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "只有時間段任務可設定進度",
      path: ["progress"],
    });
  }

  if (isBacklog) return; // 靈感箱跳過所有時間/配置要求

  if (type === "recurring") {
    // 模板需要 recurrenceConfig；實例（parentTaskId 非空）不檢查
    if (isTemplate && !data.recurrenceConfig) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "週期任務必須提供週期配置 (recurrenceConfig)",
        path: ["recurrenceConfig"],
      });
    }
  } else if (data.recurrenceConfig) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "只有週期任務才能提供週期配置 (recurrenceConfig)",
      path: ["recurrenceConfig"],
    });
  }

  if (type === "window") {
    if (data.recurrenceConfig) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "時間段任務不可設定週期配置",
        path: ["recurrenceConfig"],
      });
    }
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "開始日期不能晚於結束日期",
        path: ["endDate"],
      });
    }
  }
}

export const createTaskSchema = z
  .object({
    title: z.string().trim().min(1, "標題不能為空").max(200, "標題最多 200 個字符"),
    ...taskFields,
    priority: z.enum(TASK_PRIORITY).default("medium"),
    status: z.enum(TASK_STATUS).default("pending"),
    taskType: z.enum(TASK_TYPE).default("normal"),
    progress: z.number().int().min(0).max(100).default(0),
    isBacklog: z.boolean().default(false),
  })
  .superRefine(refineTask);

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    ...taskFields,
    priority: z.enum(TASK_PRIORITY).optional(),
    status: z.enum(TASK_STATUS).optional(),
    taskType: z.enum(TASK_TYPE).optional(),
  })
  .superRefine(refineTask);

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm --filter @ftm/shared test task`
Expected: 6 passed。

- [ ] **Step 5: 全 shared 測試 ＋ typecheck**

Run: `pnpm --filter @ftm/shared test && pnpm --filter @ftm/shared typecheck`
Expected: 全 passed、無型別錯誤。

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/schemas/task.ts packages/shared/src/schemas/task.test.ts
git commit -m "feat(shared): validate window/backlog/recurring template in task schema"
```

---

## Task 7: 更新 `TaskResponse` 型別與 API `shapeTask`

API 回傳新增 `startDate`、`endDate`、`progress`、`isBacklog`。型別與 `shapeTask` 必須同步，否則 api typecheck 會因缺少必填欄位失敗。

**Files:**
- Modify: `packages/shared/src/types/api.ts`（TaskResponse，約 107-128 行）
- Modify: `apps/api/src/routes/task.ts`（`shapeTask`，約 43-74 行）

- [ ] **Step 1: 在 `TaskResponse` 介面加欄位**

在 `recurrenceConfig` / `parentTaskId` 之後、`completedAt` 之前加入：
```ts
  parentTaskId: number | null;
  startDate: string | null;
  endDate: string | null;
  progress: number;
  isBacklog: boolean;
  completedAt: number | null;
```

- [ ] **Step 2: 更新 `shapeTask` 回傳新欄位**

在 `apps/api/src/routes/task.ts` 的 `shapeTask` return 物件中，`parentTaskId: t.parentTaskId,` 之後、`completedAt:` 之前加入：
```ts
    parentTaskId: t.parentTaskId,
    startDate: t.startDate,
    endDate: t.endDate,
    progress: t.progress,
    isBacklog: t.isBacklog,
```

- [ ] **Step 3: typecheck**

Run: `pnpm --filter @ftm/shared typecheck && pnpm --filter @ftm/api typecheck`
Expected: 無錯誤。

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/api.ts apps/api/src/routes/task.ts
git commit -m "feat(shared,api): add window/backlog fields to TaskResponse and shapeTask"
```

---

## Task 8: API 產生服務 `services/recurrence.ts`

核心 DB glue：對每個 `recurring` 模板，補齊近 3 年窗內缺少的實例（保底至少 1 筆）。實例 = 真實 task row，`parentTaskId=模板id`、`taskType=recurring`、有具體 `dueDate`。

**Files:**
- Create: `apps/api/src/services/recurrence.ts`

- [ ] **Step 1: 建立服務檔**

Create `apps/api/src/services/recurrence.ts`：
```ts
import type { Env } from "../types";
import { createDb } from "../db/client";
import { tasks } from "../db/schema";
import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { computeOccurrences, nextOccurrenceAfter } from "@ftm/shared";
import type { RecurrenceConfig } from "@ftm/shared";

const HORIZON_YEARS = 3;

function todayISO(now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function horizonISO(now: Date): string {
  const end = new Date(now);
  end.setUTCFullYear(end.getUTCFullYear() + HORIZON_YEARS);
  return todayISO(end);
}

/** 算出某模板「應該存在」的所有 dueDate（近 3 年窗 + 保底至少 1 筆） */
export function targetDatesFor(config: RecurrenceConfig, now: Date): string[] {
  const from = todayISO(now);
  const to = horizonISO(now);
  const occ = computeOccurrences(config, from, to);
  if (occ.length > 0) return occ;
  const next = nextOccurrenceAfter(config, from);
  return next ? [next] : [];
}

type DbClient = ReturnType<typeof createDb>;

/**
 * 為單一模板補齊缺少的實例。回傳新建立的筆數。
 * @param template 一筆 recurring 且 parentTaskId 為 null 的 task row
 */
export async function generateInstancesForTemplate(
  db: DbClient,
  template: typeof tasks.$inferSelect,
  now: Date,
): Promise<number> {
  if (template.taskType !== "recurring" || template.parentTaskId != null) return 0;
  if (!template.recurrenceConfig) return 0;

  const wanted = targetDatesFor(template.recurrenceConfig, now);
  if (wanted.length === 0) return 0;

  // 既有實例的 dueDate 集合
  const existing = await db
    .select({ dueDate: tasks.dueDate })
    .from(tasks)
    .where(and(eq(tasks.parentTaskId, template.id), isNotNull(tasks.dueDate)));
  const existingSet = new Set(existing.map((r) => r.dueDate));

  const toInsert = wanted
    .filter((d) => !existingSet.has(d))
    .map((d) => ({
      teamId: template.teamId,
      title: template.title,
      description: template.description,
      creatorId: template.creatorId,
      assigneeId: template.assigneeId,
      categoryId: template.categoryId,
      priority: template.priority,
      status: "pending" as const,
      dueDate: d,
      taskType: "recurring" as const,
      recurrenceConfig: null,
      parentTaskId: template.id,
    }));

  if (toInsert.length === 0) return 0;
  await db.insert(tasks).values(toInsert);
  return toInsert.length;
}

/** 掃描所有 recurring 模板並補齊實例（cron 用）。 */
export async function generateAllRecurringInstances(env: Env, now = new Date()): Promise<void> {
  try {
    const db = createDb(env.DB);
    const templates = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.taskType, "recurring"), isNull(tasks.parentTaskId)));

    console.log(`[recurrence] ${templates.length} templates to expand`);
    let total = 0;
    for (const tpl of templates) {
      total += await generateInstancesForTemplate(db, tpl, now);
    }
    console.log(`[recurrence] generated ${total} instances`);
  } catch (err) {
    console.error("[recurrence] generateAllRecurringInstances error:", err);
  }
}
```

- [ ] **Step 2: typecheck**

Run: `pnpm --filter @ftm/api typecheck`
Expected: 無錯誤。

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/recurrence.ts
git commit -m "feat(api): add recurring instance generation service"
```

---

## Task 9: 掛上 cron ＋ 建立模板時即時產生

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/routes/task.ts`（POST handler，約 171-214 行）

- [ ] **Step 1: cron 加掛產生服務**

Replace `apps/api/src/index.ts` 全部：
```ts
import { app } from "./app";
import type { Env } from "./types";
import { runDueReminders } from "./services/reminder";
import { generateAllRecurringInstances } from "./services/recurrence";

export default {
  fetch: app.fetch,

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    // 先補齊週期實例，再跑到期提醒（提醒會掃到新生的實例）
    ctx.waitUntil(
      generateAllRecurringInstances(env).then(() => runDueReminders(env)),
    );
  },
} satisfies ExportedHandler<Env>;
```

- [ ] **Step 2: POST /tasks 建立 recurring 模板後即時產生實例**

在 `apps/api/src/routes/task.ts`，先在檔案頂部 import 區（約第 11 行 `import { fail, ok }...` 附近）加入：
```ts
import { generateInstancesForTemplate } from "../services/recurrence";
```

然後在 POST handler 內，`taskHistory` insert（約第 193-198 行）之後、`assigneeId` 通知（約第 200 行）之前，插入：
```ts
  // 建立週期模板時即時產生實例（補齊 3 年窗 + 保底），不必等 cron
  if (task.taskType === "recurring" && task.parentTaskId == null && task.recurrenceConfig) {
    await generateInstancesForTemplate(db, task, new Date());
  }
```

- [ ] **Step 3: typecheck**

Run: `pnpm --filter @ftm/api typecheck`
Expected: 無錯誤。

- [ ] **Step 4: 本地手動驗證**

啟動本地 API：`pnpm dev:api`（另開終端）。用既有帳號取得 token 後（或直接以 D1 local 檢視），建立一個 interval 週期任務，確認資料庫生出多筆實例：

Run（建立後查 local D1）:
```bash
pnpm --filter @ftm/api exec wrangler d1 execute ftm --local \
  --command "SELECT id, title, due_date, parent_task_id FROM tasks WHERE parent_task_id IS NOT NULL ORDER BY due_date LIMIT 10;"
```
Expected: 列出多筆 `parent_task_id` 非空、`due_date` 遞增的實例。

> 若無方便的測試帳號，可改在 Task 12 前用前端建立後再驗。此步驟為手動 smoke，不阻塞後續。

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/index.ts apps/api/src/routes/task.ts
git commit -m "feat(api): generate recurring instances on cron and template creation"
```

---

## Task 10: 系列編輯/刪除時處理未來未完成實例

編輯模板 → 重生未來未完成實例；刪除模板 → 刪未來未完成實例（保留已完成歷史）。

**Files:**
- Modify: `apps/api/src/routes/task.ts`（PATCH handler、DELETE handler）

- [ ] **Step 1: PATCH 模板時重生未來實例**

在 `apps/api/src/routes/task.ts` 的 PATCH handler，於成功取得 `updated`（約第 330-338 行 `const [updated] = await db.update...` 之後）插入：
```ts
  // 系列模板被編輯：刪掉未來未完成實例後重生，已完成歷史保留
  const isTemplate = updated.taskType === "recurring" && updated.parentTaskId == null;
  const recurrenceChanged =
    changes.recurrenceConfig !== undefined ||
    changes.title !== undefined ||
    changes.taskType !== undefined;
  if (isTemplate && recurrenceChanged && updated.recurrenceConfig) {
    const todayStr = new Date().toISOString().slice(0, 10);
    await db
      .delete(tasks)
      .where(
        and(
          eq(tasks.parentTaskId, updated.id),
          ne(tasks.status, "completed"),
          gte(tasks.dueDate, todayStr),
        ),
      );
    await generateInstancesForTemplate(db, updated, new Date());
  }
```

並在檔案頂部的 drizzle import（第 8 行）補上 `ne`、`gte`：
```ts
import { eq, and, inArray, desc, ne, gte } from "drizzle-orm";
```

- [ ] **Step 2: DELETE 模板時刪未來未完成實例**

在 DELETE handler，於 `await db.delete(tasks).where(...)`（約第 437 行，刪除任務本身）之前插入：
```ts
  // 若刪的是系列模板：先刪未來未完成實例，保留已完成歷史
  if (existing.taskType === "recurring" && existing.parentTaskId == null) {
    const todayStr = new Date().toISOString().slice(0, 10);
    await db
      .delete(tasks)
      .where(
        and(
          eq(tasks.parentTaskId, taskId),
          ne(tasks.status, "completed"),
          gte(tasks.dueDate, todayStr),
        ),
      );
  }
```

- [ ] **Step 3: typecheck**

Run: `pnpm --filter @ftm/api typecheck`
Expected: 無錯誤。

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/task.ts
git commit -m "feat(api): regenerate/cleanup future instances on series edit/delete"
```

---

## Task 11: 簡化 `reminder.ts`（移除虛擬重複分支）

實例現在是有 `dueDate` 的真實 row，直接走到期提醒；模板（recurring 且 parentTaskId 為空）排除在提醒外。

**Files:**
- Modify: `apps/api/src/services/reminder.ts`

- [ ] **Step 1: 移除 `shouldShowRecurringTask` import 與整個 recurring 分支**

在 `apps/api/src/services/reminder.ts`：
- 刪除第 5 行 `import { shouldShowRecurringTask } from "@ftm/shared";`。
- 刪除「── 2. 週期任務提醒 ──」整段（約第 48-74 行：`recurringTasks` 查詢與 `activeRecurringTasks` 過濾）。
- 把 `const allTasks = [...dueTasks, ...activeRecurringTasks];`（約第 77 行）改為 `const allTasks = dueTasks;`。

- [ ] **Step 2: 到期查詢改為「排除模板」而非「排除所有 recurring」**

把第 1 段到期查詢的 where（約第 37-44 行）：
```ts
      .where(
        and(
          ne(tasks.taskType, "recurring"),
          notInArray(tasks.status, ["completed", "cancelled"]),
          gte(tasks.dueDate, todayStr),
          lte(tasks.dueDate, tomorrowStr),
        ),
      );
```
改為（模板 = recurring 且 parentTaskId 為空；只排除模板，保留實例）：
```ts
      .where(
        and(
          isNotNull(tasks.dueDate),
          notInArray(tasks.status, ["completed", "cancelled"]),
          gte(tasks.dueDate, todayStr),
          lte(tasks.dueDate, tomorrowStr),
          // 排除週期「模板」本身（它沒有 dueDate，但防禦性保留）
          not(and(eq(tasks.taskType, "recurring"), isNull(tasks.parentTaskId))),
        ),
      );
```

並更新檔案頂部 drizzle import（第 4 行），確保含 `isNull`、`not`、`eq`、`isNotNull`：
```ts
import { eq, and, notInArray, isNotNull, isNull, not, lte, gte, inArray } from "drizzle-orm";
```
（移除不再使用的 `ne`。）

- [ ] **Step 3: typecheck**

Run: `pnpm --filter @ftm/api typecheck`
Expected: 無錯誤（若報未使用的 import，依提示移除）。

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/services/reminder.ts
git commit -m "refactor(api): treat recurring instances as normal due tasks in reminders"
```

---

## Task 12: 前端退場虛擬展開（`calendar/recurrence.ts`）

重複實例已是真實 row，前端不再展開。改成濾掉模板、標記實例。

**Files:**
- Rewrite: `apps/web/src/features/calendar/recurrence.ts`
- Test: `apps/web/src/features/calendar/recurrence.test.ts`

- [ ] **Step 1: 寫失敗測試**

Create `apps/web/src/features/calendar/recurrence.test.ts`：
```ts
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
    expect(out[0].isRecurringInstance).toBe(true);
  });

  it("keeps normal dated tasks, drops undated", () => {
    const out = toCalendarTasks([
      mk({ id: 3, dueDate: "2026-06-11" }),
      mk({ id: 4, dueDate: null }),
    ]);
    expect(out.map((t) => t.id)).toEqual([3]);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter @ftm/web test recurrence`
Expected: FAIL with "toCalendarTasks is not a function"。

- [ ] **Step 3: 重寫 `recurrence.ts`**

Replace 整個 `apps/web/src/features/calendar/recurrence.ts`：
```ts
import type { TaskResponse } from "@ftm/shared";

export interface CalendarTask extends TaskResponse {
  isRecurringInstance?: boolean;
}

export function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 把後端任務列表轉成日曆任務：
 * - 濾掉週期「模板」（recurring 且 parentTaskId 為空，本身無 dueDate）
 * - 濾掉沒有 dueDate 的任務（不落在日曆格）
 * - 週期實例（parentTaskId 非空）標記 isRecurringInstance 供樣式區分
 * window 類型的帶狀渲染由 Plan 2 另外處理，這裡只處理「落在某天的點」。
 */
export function toCalendarTasks(tasks: TaskResponse[]): CalendarTask[] {
  return tasks
    .filter((t) => !(t.taskType === "recurring" && t.parentTaskId == null))
    .filter((t) => !!t.dueDate)
    .map((t) => ({
      ...t,
      isRecurringInstance: t.taskType === "recurring" && t.parentTaskId != null,
    }));
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm --filter @ftm/web test recurrence`
Expected: 3 passed。

- [ ] **Step 5: 更新 DashboardPage 與 CalendarPage 的呼叫點**

在 `apps/web/src/features/dashboard/DashboardPage.tsx`：
- 找到 `import { ... expandRecurringTasks ... } from "...calendar/recurrence"`，把 `expandRecurringTasks` 改為 `toCalendarTasks`（保留 `formatDateKey`、`CalendarTask` 等其他 import）。
- 找到呼叫 `expandRecurringTasks(tasks, weekStart, weekEnd)`（或類似的 start/end 參數）的地方，改為 `toCalendarTasks(tasks)`（移除日期範圍參數）。

在 `apps/web/src/features/calendar/CalendarPage.tsx`：
- 同樣把 `expandRecurringTasks(...)` 的 import 與呼叫改為 `toCalendarTasks(tasks)`。
- 若該頁原本以 `shouldShowRecurringTask` 判斷某格是否顯示，改為直接用 `toCalendarTasks(tasks)` 結果依 `dueDate` 比對日期格。

> 具體呼叫簽名以檔案現況為準；目標是移除所有對 `expandRecurringTasks` / 舊 `shouldShowRecurringTask` 的引用。

- [ ] **Step 6: 驗證無殘留引用**

Run: `cd /Users/dc/Documents/DylanChiang-Dev/DC-family-task-manager && grep -rn "expandRecurringTasks\|shouldShowRecurringTask" apps/web/src`
Expected: 無輸出（全部已移除）。

- [ ] **Step 7: typecheck ＋ web 測試**

Run: `pnpm --filter @ftm/web typecheck && pnpm --filter @ftm/web test`
Expected: 型別通過；既有測試與新 recurrence 測試通過（TaskFormDialog 測試此時可能失敗，下一個任務處理）。

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/calendar/recurrence.ts apps/web/src/features/calendar/recurrence.test.ts apps/web/src/features/dashboard/DashboardPage.tsx apps/web/src/features/calendar/CalendarPage.tsx
git commit -m "refactor(web): render real recurring instances instead of virtual expansion"
```

---

## Task 13: 表單重複 UI 改 interval / anchored

`TaskFormDialog` 的類型選單移除「可重複」，重複區塊改成「模式（間隔/對齊）＋ 對應輸入」。

**Files:**
- Modify: `apps/web/src/features/tasks/TaskFormDialog.tsx`
- Modify: `apps/web/src/features/tasks/TaskFormDialog.test.tsx`

- [ ] **Step 1: 改寫測試以對齊新 UI 與 payload**

把 `apps/web/src/features/tasks/TaskFormDialog.test.tsx` 中「creates a recurring assigned task」測試替換為以下（建立 anchored weekly）：
```ts
  it("creates an anchored weekly recurring task", async () => {
    let posted: any = null;
    server.use(
      http.post(`${BASE}/tasks`, async ({ request: req }) => {
        posted = await req.json();
        return HttpResponse.json({ success: true, data: { id: 1 } }, { status: 201 });
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(<TaskFormDialog open onOpenChange={() => {}} />);
    await user.type(screen.getByLabelText("標題"), "每週掃地");
    await user.click(screen.getByLabelText("任務類型"));
    await user.click((await screen.findAllByText("週期")).at(-1)!);

    // 預設模式為「對齊」週，輸入週幾
    await user.click(screen.getByLabelText("重複模式"));
    await user.click((await screen.findAllByText("對齊特定日")).at(-1)!);
    await user.click(screen.getByLabelText("對齊單位"));
    await user.click((await screen.findAllByText("每週")).at(-1)!);
    await user.clear(screen.getByLabelText("星期（0=日，逗號分隔）"));
    await user.type(screen.getByLabelText("星期（0=日，逗號分隔）"), "1,3");

    await user.click(screen.getByRole("button", { name: "建立" }));

    await waitFor(() =>
      expect(posted).toMatchObject({
        title: "每週掃地",
        taskType: "recurring",
        recurrenceConfig: { mode: "anchored", unit: "week", weekdays: [1, 3] },
      }),
    );
  });

  it("creates an interval recurring task", async () => {
    let posted: any = null;
    server.use(
      http.post(`${BASE}/tasks`, async ({ request: req }) => {
        posted = await req.json();
        return HttpResponse.json({ success: true, data: { id: 1 } }, { status: 201 });
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(<TaskFormDialog open onOpenChange={() => {}} />);
    await user.type(screen.getByLabelText("標題"), "每10週回診");
    await user.click(screen.getByLabelText("任務類型"));
    await user.click((await screen.findAllByText("週期")).at(-1)!);

    await user.click(screen.getByLabelText("重複模式"));
    await user.click((await screen.findAllByText("固定間隔")).at(-1)!);
    await user.clear(screen.getByLabelText("間隔數"));
    await user.type(screen.getByLabelText("間隔數"), "10");
    await user.click(screen.getByLabelText("間隔單位"));
    await user.click((await screen.findAllByText("週")).at(-1)!);

    await user.click(screen.getByRole("button", { name: "建立" }));

    await waitFor(() =>
      expect(posted).toMatchObject({
        title: "每10週回診",
        taskType: "recurring",
        recurrenceConfig: { mode: "interval", every: 10, unit: "week" },
      }),
    );
  });
```

> 注：interval 的 `anchorDate` 由表單以「今天」帶入，斷言用 `toMatchObject` 不檢查該欄位。

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter @ftm/web test TaskFormDialog`
Expected: FAIL（新 UI 尚未實作，找不到「重複模式」等標籤）。

- [ ] **Step 3: 改寫 `TaskFormDialog.tsx` 的重複輔助與 UI**

在 `apps/web/src/features/tasks/TaskFormDialog.tsx`：

(a) 移除舊的 `type Frequency`、`defaultRecurrenceConfig`、`serializeRecurrenceConfig`、`recurrenceValue`（第 35-93 行），替換為：
```ts
import { RECURRENCE_UNIT, type RecurrenceUnit } from "@ftm/shared";

function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

type RecurrenceMode = "interval" | "anchored";

function recurrenceMode(config: RecurrenceConfig | null | undefined): RecurrenceMode {
  return config?.mode === "interval" ? "interval" : "anchored";
}

function recurrenceUnit(config: RecurrenceConfig | null | undefined): RecurrenceUnit {
  if (!config) return "week";
  if (config.mode === "interval") return config.unit;
  return config.unit;
}

function defaultForMode(mode: RecurrenceMode, unit: RecurrenceUnit): RecurrenceConfig {
  if (mode === "interval") {
    return { mode: "interval", every: 1, unit, anchorDate: todayISO() };
  }
  switch (unit) {
    case "week":
      return { mode: "anchored", unit: "week", weekdays: [1] };
    case "month":
      return { mode: "anchored", unit: "month", dates: [1] };
    case "year":
      return { mode: "anchored", unit: "year", month: 1, date: 1 };
    case "day":
      // anchored 不支援 day → 退回 interval 每 1 天
      return { mode: "interval", every: 1, unit: "day", anchorDate: todayISO() };
  }
}

// anchored 的「值」輸入序列化（週幾 / 月幾號 / 年月日）
function serializeAnchored(unit: RecurrenceUnit, value: string): RecurrenceConfig {
  if (unit === "week") {
    const weekdays = value.split(",").map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
    return { mode: "anchored", unit: "week", weekdays: weekdays.length ? weekdays : [1] };
  }
  if (unit === "month") {
    const dates = value.split(",").map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n >= 1 && n <= 31);
    return { mode: "anchored", unit: "month", dates: dates.length ? dates : [1] };
  }
  // year
  const parts = value.split("-").map((s) => Number(s.trim()));
  const month = Number.isInteger(parts[0]) && parts[0] >= 1 && parts[0] <= 12 ? parts[0] : 1;
  const date = Number.isInteger(parts[1]) && parts[1] >= 1 && parts[1] <= 31 ? parts[1] : 1;
  return { mode: "anchored", unit: "year", month, date };
}

function anchoredValue(config: RecurrenceConfig | null | undefined): string {
  if (!config || config.mode !== "anchored") return "1";
  if (config.unit === "week") return config.weekdays.join(",");
  if (config.unit === "month") return config.dates.join(",");
  return `${config.month}-${config.date}`;
}
```

(b) 在 component 內，把
```ts
  const recurrenceFrequency = recurrenceConfig?.frequency ?? "daily";
```
改為
```ts
  const rMode = recurrenceMode(recurrenceConfig);
  const rUnit = recurrenceUnit(recurrenceConfig);
```

(c) 類型選單（約第 255-259 行）移除「可重複」項，改為：
```tsx
                <SelectContent>
                  <SelectItem value="normal">一般</SelectItem>
                  <SelectItem value="recurring">週期</SelectItem>
                </SelectContent>
```
並把切到 recurring 時的預設 config（約第 246-249 行 `setValue("recurrenceConfig", ...)`）改為：
```tsx
                  setValue(
                    "recurrenceConfig",
                    nextType === "recurring" ? defaultForMode("anchored", "week") : null,
                  );
```

(d) 把原本 `taskType === "recurring"` 的「週期頻率」區塊（第 262-282 行）與其下方「recurrenceValue 輸入」區塊（第 284-304 行）整段替換為：
```tsx
            {taskType === "recurring" && (
              <div className="space-y-1.5">
                <Label>重複模式</Label>
                <Select
                  value={rMode}
                  onValueChange={(v) =>
                    setValue("recurrenceConfig", defaultForMode(v as RecurrenceMode, rUnit === "day" ? "week" : rUnit))
                  }
                >
                  <SelectTrigger aria-label="重複模式">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interval">固定間隔</SelectItem>
                    <SelectItem value="anchored">對齊特定日</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {taskType === "recurring" && rMode === "interval" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="intervalEvery">間隔數</Label>
                <Input
                  id="intervalEvery"
                  type="number"
                  min={1}
                  value={recurrenceConfig?.mode === "interval" ? recurrenceConfig.every : 1}
                  onChange={(e) =>
                    setValue("recurrenceConfig", {
                      mode: "interval",
                      every: Math.max(1, Number(e.target.value) || 1),
                      unit: rUnit === "day" || rUnit === "week" || rUnit === "month" || rUnit === "year" ? rUnit : "week",
                      anchorDate: todayISO(),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>間隔單位</Label>
                <Select
                  value={rUnit}
                  onValueChange={(v) =>
                    setValue("recurrenceConfig", {
                      mode: "interval",
                      every: recurrenceConfig?.mode === "interval" ? recurrenceConfig.every : 1,
                      unit: v as RecurrenceUnit,
                      anchorDate: todayISO(),
                    })
                  }
                >
                  <SelectTrigger aria-label="間隔單位">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">天</SelectItem>
                    <SelectItem value="week">週</SelectItem>
                    <SelectItem value="month">月</SelectItem>
                    <SelectItem value="year">年</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {taskType === "recurring" && rMode === "anchored" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>對齊單位</Label>
                <Select
                  value={rUnit === "day" ? "week" : rUnit}
                  onValueChange={(v) => setValue("recurrenceConfig", defaultForMode("anchored", v as RecurrenceUnit))}
                >
                  <SelectTrigger aria-label="對齊單位">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">每週</SelectItem>
                    <SelectItem value="month">每月</SelectItem>
                    <SelectItem value="year">每年</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="anchoredValue">
                  {rUnit === "week"
                    ? "星期（0=日，逗號分隔）"
                    : rUnit === "month"
                      ? "日期（1-31，逗號分隔）"
                      : "月份-日期"}
                </Label>
                <Input
                  id="anchoredValue"
                  value={anchoredValue(recurrenceConfig)}
                  onChange={(e) =>
                    setValue("recurrenceConfig", serializeAnchored(rUnit === "day" ? "week" : rUnit, e.target.value))
                  }
                />
              </div>
            </div>
          )}
```

> 注意：(d) 的第一段 `</div>` 收掉的是原本「任務類型 ＋ 重複模式」那個 `grid sm:grid-cols-2` 容器（對應第 238 行 `<div className="grid gap-3 sm:grid-cols-2">` 的開頭）。實作時對齊既有 JSX 結構，確保標籤閉合正確。

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm --filter @ftm/web test TaskFormDialog`
Expected: 兩個新測試（anchored weekly、interval）passed。

- [ ] **Step 5: 全量 typecheck ＋ 測試 ＋ build**

Run: `pnpm typecheck && pnpm --filter @ftm/web test && pnpm --filter @ftm/shared test`
Expected: 全綠。

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/tasks/TaskFormDialog.tsx apps/web/src/features/tasks/TaskFormDialog.test.tsx
git commit -m "feat(web): interval/anchored recurrence form, drop repeatable type"
```

---

## Task 14: 整體驗證

**Files:** 無（驗證步驟）

- [ ] **Step 1: 全 monorepo typecheck**

Run: `pnpm typecheck`
Expected: 所有 package 無型別錯誤。

- [ ] **Step 2: 全測試**

Run: `pnpm --filter @ftm/shared test && pnpm --filter @ftm/web test`
Expected: 全綠。

- [ ] **Step 3: API build dry-run**

Run: `pnpm --filter @ftm/api build`
Expected: wrangler dry-run 成功，無錯誤。

- [ ] **Step 4: 殘留引用掃描**

Run: `cd /Users/dc/Documents/DylanChiang-Dev/DC-family-task-manager && grep -rn "repeatable\|RECURRENCE_FREQ\|\.frequency" packages apps/web/src apps/api/src`
Expected: 無輸出（舊類型/枚舉/欄位全部退場）。

- [ ] **Step 5: 部署前提醒（人工把關，先不執行）**

提醒使用者：依鐵律，正式上線需先 `pnpm --filter @ftm/api db:migrate:remote`（套用 0003 遷移）再 `pnpm --filter @ftm/api deploy`。Plan 2、Plan 3 會沿用同一個 0003 遷移（欄位已一次加齊），故部署可在三個計畫都完成後一次進行，或本計畫先行上線。

---

## 自我檢查（Spec 覆蓋）

- ✅ 類型改 `normal/recurring/window`、移除 `repeatable` → Task 1、Task 13。
- ✅ `recurrenceConfig` interval/anchored、支援每 N 單位與對齊特定日 → Task 3。
- ✅ 月底 clamp（2/30→2/28）→ Task 4 引擎測試。
- ✅ eager 產生、近 3 年窗、保底至少 1 筆 → Task 5、Task 8。
- ✅ 建立模板即時產生 → Task 9。
- ✅ 編輯重生未來未完成、刪除保留歷史、單獨改實例脫鉤（實例 PATCH 不觸發模板重生，因 isTemplate=false）→ Task 10。
- ✅ 實例走到期提醒路徑 → Task 11。
- ✅ 前端退場虛擬展開、實例為真實 row、視覺標記 → Task 12。
- ✅ 表單 interval/anchored → Task 13。
- ✅ window/backlog 欄位與校驗骨架（行為在 Plan 2/3）→ Task 1、Task 6、Task 7。
- ✅ 單次遷移、先遷移再部署 → Task 1、Task 14。
