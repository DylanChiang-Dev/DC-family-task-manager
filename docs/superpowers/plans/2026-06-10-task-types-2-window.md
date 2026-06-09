# Plan 2 — 時間段任務（window）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**前置：** 需先完成 Plan 1（基礎欄位 `startDate`/`endDate`/`progress`、`window` 類型、校驗骨架已就緒）。

**Goal:** 實作 `window`（時間段）任務：建立表單選「時間段」並填區間；日曆上以橫跨多天的帶狀顯示（複用 schedule-block 帶狀 pattern）；三段式逾期（開始日前不催、區間內進行、過結束日才逾期）；可拉動的百分比進度條，100% 與完成狀態同步。

**Architecture:** 帶狀位置計算、逾期判定抽成 `@ftm/web` 的純函式模組（可單元測試）；DashboardPage 在既有 schedule-block 帶狀下方再加一條「時間段任務」帶狀；進度條用原生 `<input type="range">`（專案無 slider 元件）。後端 PATCH 負責 progress↔status 同步。

**Tech Stack:** TypeScript、Zod（已於 Plan 1 完成校驗）、Hono、React、React Query、Vitest + Testing Library + MSW。

---

## File Structure

**`apps/api/src`**
- Modify `routes/task.ts` — POST 寫入 `startDate`/`endDate`/`progress`；PATCH 更新這些欄位並做 progress↔status 同步。

**`apps/web/src`**
- Create `features/calendar/windows.ts` — 純函式：篩 window 任務、帶狀 span 計算、三段式狀態判定。
- Create `features/calendar/windows.test.ts` — 純函式單元測試。
- Modify `features/tasks/TaskFormDialog.tsx` — 加「時間段」類型與 start/end 欄位。
- Modify `features/tasks/TaskFormDialog.test.tsx` — 新增建立 window 測試。
- Create `features/tasks/TaskProgressBar.tsx` — 可拉動進度條元件。
- Modify `features/tasks/TaskDetailPage.tsx` — window 顯示區間與進度條。
- Modify `features/dashboard/DashboardPage.tsx` — window 帶狀渲染 ＋ 逾期/選定日納入 window。

---

## Task 1: 後端持久化 window 欄位 ＋ progress↔status 同步

**Files:**
- Modify: `apps/api/src/routes/task.ts`（POST handler 的 insert values；PATCH handler 的欄位處理）

- [ ] **Step 1: POST 寫入 window 欄位**

在 `apps/api/src/routes/task.ts` POST handler 的 `db.insert(tasks).values({...})`（約 173-186 行），於 `parentTaskId: body.parentTaskId ?? null,` 之後加入：
```ts
      parentTaskId: body.parentTaskId ?? null,
      startDate: body.startDate ?? null,
      endDate: body.endDate ?? null,
      progress: body.progress ?? 0,
      isBacklog: body.isBacklog ?? false,
```

- [ ] **Step 2: PATCH 處理 window 欄位與 progress↔status 同步**

在 PATCH handler 的欄位處理區，於 `parentTaskId` 區塊（約 319-322 行）之後、`if (Object.keys(changes).length === 0)`（約 324 行）之前插入：
```ts
  if (body.startDate !== undefined && body.startDate !== existing.startDate) {
    updateData.startDate = body.startDate;
    changes.startDate = body.startDate;
  }
  if (body.endDate !== undefined && body.endDate !== existing.endDate) {
    updateData.endDate = body.endDate;
    changes.endDate = body.endDate;
  }
  if (body.progress !== undefined && body.progress !== existing.progress) {
    updateData.progress = body.progress;
    changes.progress = body.progress;
    // 進度拉到 100 視為完成
    if (body.progress >= 100 && existing.status !== "completed") {
      updateData.status = "completed";
      changes.status = "completed";
      updateData.completedAt = new Date();
      changes.completedAt = Date.now();
    }
  }
  if (body.isBacklog !== undefined && body.isBacklog !== existing.isBacklog) {
    updateData.isBacklog = body.isBacklog;
    changes.isBacklog = body.isBacklog;
  }
  // 標記完成的 window 任務，進度補滿 100
  if (
    body.status === "completed" &&
    (body.taskType ?? existing.taskType) === "window" &&
    body.progress === undefined
  ) {
    updateData.progress = 100;
    changes.progress = 100;
  }
```

> 注意：此區塊放在既有的 status 處理（約 291-302 行）之後即可正確覆寫；status 變更已先被處理，這裡只補 progress。

- [ ] **Step 3: typecheck**

Run: `pnpm --filter @ftm/api typecheck`
Expected: 無錯誤。

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/task.ts
git commit -m "feat(api): persist window fields and sync progress/status"
```

---

## Task 2: 前端 window 純函式模組

帶狀位置與三段式狀態抽成可測試純函式。

**Files:**
- Create: `apps/web/src/features/calendar/windows.ts`
- Test: `apps/web/src/features/calendar/windows.test.ts`

- [ ] **Step 1: 寫失敗測試**

Create `apps/web/src/features/calendar/windows.test.ts`：
```ts
import { describe, it, expect } from "vitest";
import { getWindowTasks, windowState, getWeekSpans } from "./windows";
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

describe("getWindowTasks", () => {
  it("keeps only non-backlog window tasks with both dates", () => {
    const out = getWindowTasks([
      mk({ id: 1, taskType: "window", startDate: "2026-06-10", endDate: "2026-06-20" }),
      mk({ id: 2, taskType: "window", startDate: null, endDate: "2026-06-20" }),
      mk({ id: 3, taskType: "window", startDate: "2026-06-10", endDate: "2026-06-20", isBacklog: true }),
      mk({ id: 4, taskType: "normal" }),
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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter @ftm/web test windows`
Expected: FAIL（模組不存在）。

- [ ] **Step 3: 實作 `windows.ts`**

Create `apps/web/src/features/calendar/windows.ts`：
```ts
import type { TaskResponse } from "@ftm/shared";

/** 取出可在日曆顯示的時間段任務（非靈感箱、兩端日期齊全） */
export function getWindowTasks(tasks: TaskResponse[]): TaskResponse[] {
  return tasks.filter(
    (t) => t.taskType === "window" && !t.isBacklog && !!t.startDate && !!t.endDate,
  );
}

export type WindowState = "upcoming" | "active" | "overdue" | "done";

/** 三段式狀態判定（todayKey 為 YYYY-MM-DD） */
export function windowState(task: TaskResponse, todayKey: string): WindowState {
  if (task.status === "completed") return "done";
  if (task.status === "cancelled") return "done";
  if (task.startDate && todayKey < task.startDate) return "upcoming";
  if (task.endDate && todayKey > task.endDate) return "overdue";
  return "active";
}

/** 帶狀區間：通用於任何 { id, startDate, endDate } 物件 */
export interface Spannable {
  id: number;
  startDate: string;
  endDate: string;
}

export function getWeekSpans<T extends Spannable>(
  weekCells: { key: string }[],
  items: T[],
): { item: T; colStart: number; colEnd: number }[] {
  const weekStartKey = weekCells[0]!.key;
  const weekEndKey = weekCells[6]!.key;
  return items
    .filter((it) => it.startDate <= weekEndKey && it.endDate >= weekStartKey)
    .map((it) => {
      const rawStart =
        it.startDate <= weekStartKey ? 0 : weekCells.findIndex((c) => c.key === it.startDate);
      const rawEnd =
        it.endDate >= weekEndKey ? 6 : weekCells.findIndex((c) => c.key === it.endDate);
      return {
        item: it,
        colStart: rawStart < 0 ? 0 : rawStart,
        colEnd: rawEnd < 0 ? 6 : rawEnd,
      };
    });
}

/** window 是否與某日期重疊 */
export function windowOverlapsDate(task: TaskResponse, dateKey: string): boolean {
  return !!task.startDate && !!task.endDate && task.startDate <= dateKey && task.endDate >= dateKey;
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm --filter @ftm/web test windows`
Expected: 全部 passed。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/calendar/windows.ts apps/web/src/features/calendar/windows.test.ts
git commit -m "feat(web): window task span/state pure helpers"
```

---

## Task 3: 表單加「時間段」類型與區間欄位

**Files:**
- Modify: `apps/web/src/features/tasks/TaskFormDialog.tsx`
- Modify: `apps/web/src/features/tasks/TaskFormDialog.test.tsx`

- [ ] **Step 1: 追加建立 window 的失敗測試**

在 `apps/web/src/features/tasks/TaskFormDialog.test.tsx` 末端的 `describe` 內追加：
```ts
  it("creates a window task with start/end", async () => {
    let posted: any = null;
    server.use(
      http.post(`${BASE}/tasks`, async ({ request: req }) => {
        posted = await req.json();
        return HttpResponse.json({ success: true, data: { id: 1 } }, { status: 201 });
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(<TaskFormDialog open onOpenChange={() => {}} />);
    await user.type(screen.getByLabelText("標題"), "規劃旅遊");
    await user.click(screen.getByLabelText("任務類型"));
    await user.click((await screen.findAllByText("時間段")).at(-1)!);
    await user.type(screen.getByLabelText("開始日期"), "2026-06-10");
    await user.type(screen.getByLabelText("結束日期"), "2026-06-20");
    await user.click(screen.getByRole("button", { name: "建立" }));

    await waitFor(() =>
      expect(posted).toMatchObject({
        title: "規劃旅遊",
        taskType: "window",
        startDate: "2026-06-10",
        endDate: "2026-06-20",
      }),
    );
  });
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter @ftm/web test TaskFormDialog`
Expected: FAIL（無「時間段」選項與日期欄位）。

- [ ] **Step 3: 在類型選單加「時間段」**

在 `TaskFormDialog.tsx` 類型選單 `SelectContent`（Plan 1 改成只有 normal/recurring 的那段）改為：
```tsx
                <SelectContent>
                  <SelectItem value="normal">一般</SelectItem>
                  <SelectItem value="recurring">週期</SelectItem>
                  <SelectItem value="window">時間段</SelectItem>
                </SelectContent>
```

- [ ] **Step 4: 切到 window 時設定預設、清掉 recurrenceConfig**

在類型 `onValueChange`（Plan 1 的 `setValue("recurrenceConfig", nextType === "recurring" ? ... : null)`）改為：
```tsx
                onValueChange={(v) => {
                  const nextType = v as CreateTaskInput["taskType"];
                  setValue("taskType", nextType);
                  setValue(
                    "recurrenceConfig",
                    nextType === "recurring" ? defaultForMode("anchored", "week") : null,
                  );
                  if (nextType === "window") {
                    const t = todayISO();
                    if (!watch("startDate")) setValue("startDate", t);
                    if (!watch("endDate")) setValue("endDate", t);
                  }
                }}
```

- [ ] **Step 5: 加入 window 的區間輸入區塊**

在重複區塊（Plan 1 的 `taskType === "recurring" && rMode === "anchored"` 區塊）之後加入：
```tsx
          {taskType === "window" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">開始日期</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...register("startDate", { setValueAs: (v) => v || null })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">結束日期</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...register("endDate", { setValueAs: (v) => v || null })}
                />
              </div>
            </div>
          )}
```

- [ ] **Step 6: onSubmit 帶上 window 欄位**

在 `onSubmit` 的 `input` 組裝（Plan 1 約有 `recurrenceConfig: values.taskType === "recurring" ? ... : null`）後追加 window 欄位的清理：
```ts
    const input: CreateTaskInput = {
      ...values,
      description: values.description || null,
      dueDate: values.dueDate || null,
      categoryId: values.categoryId || null,
      assigneeId: values.assigneeId || null,
      recurrenceConfig: values.taskType === "recurring" ? values.recurrenceConfig : null,
      startDate: values.taskType === "window" ? values.startDate || null : null,
      endDate: values.taskType === "window" ? values.endDate || null : null,
    };
```

並在 `useForm` 的 `defaultValues` 加入（對齊既有 defaultValues 物件）：
```ts
      startDate: task?.startDate ?? null,
      endDate: task?.endDate ?? null,
```

- [ ] **Step 7: 跑測試確認通過**

Run: `pnpm --filter @ftm/web test TaskFormDialog`
Expected: window 測試與既有 recurring 測試全 passed。

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/tasks/TaskFormDialog.tsx apps/web/src/features/tasks/TaskFormDialog.test.tsx
git commit -m "feat(web): add window type with start/end inputs to task form"
```

---

## Task 4: 進度條元件 ＋ 詳情頁顯示

**Files:**
- Create: `apps/web/src/features/tasks/TaskProgressBar.tsx`
- Test: `apps/web/src/features/tasks/TaskProgressBar.test.tsx`
- Modify: `apps/web/src/features/tasks/TaskDetailPage.tsx`

- [ ] **Step 1: 寫進度條失敗測試**

Create `apps/web/src/features/tasks/TaskProgressBar.test.tsx`：
```ts
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaskProgressBar } from "./TaskProgressBar";

describe("TaskProgressBar", () => {
  it("shows current percent", () => {
    render(<TaskProgressBar value={40} onChange={() => {}} />);
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("emits new value on slider change", () => {
    const onChange = vi.fn();
    render(<TaskProgressBar value={40} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("進度"), { target: { value: "70" } });
    expect(onChange).toHaveBeenCalledWith(70);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter @ftm/web test TaskProgressBar`
Expected: FAIL（元件不存在）。

- [ ] **Step 3: 實作進度條**

Create `apps/web/src/features/tasks/TaskProgressBar.tsx`：
```tsx
export function TaskProgressBar({
  value,
  onChange,
  readOnly = false,
}: {
  value: number;
  onChange?: (next: number) => void;
  readOnly?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>進度</span>
        <span>{clamped}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${clamped}%` }} />
      </div>
      {!readOnly && (
        <input
          type="range"
          aria-label="進度"
          min={0}
          max={100}
          step={5}
          value={clamped}
          onChange={(e) => onChange?.(Number(e.target.value))}
          className="w-full"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm --filter @ftm/web test TaskProgressBar`
Expected: 2 passed。

- [ ] **Step 5: 詳情頁顯示區間與進度條**

在 `apps/web/src/features/tasks/TaskDetailPage.tsx`：
- 頂部 import 加：
```ts
import { useUpdateTask } from "./hooks";
import { TaskProgressBar } from "./TaskProgressBar";
```
- 在 component 內取得 mutation：
```ts
  const updateMutation = useUpdateTask();
```
- 在第一張 Card 的 `{task.description && ...}`（約 68 行）之後，加入 window 專屬區塊：
```tsx
        {task.taskType === "window" && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-sm text-muted-foreground">
              時間段：{task.startDate ?? "—"} ~ {task.endDate ?? "—"}
            </p>
            <TaskProgressBar
              value={task.progress}
              onChange={(next) =>
                updateMutation.mutate(
                  { id: task.id, input: { progress: next } },
                  { onError: (e) => toast.error(e instanceof ApiError ? e.message : "更新失敗") },
                )
              }
            />
          </div>
        )}
```

- [ ] **Step 6: typecheck ＋ 測試**

Run: `pnpm --filter @ftm/web typecheck && pnpm --filter @ftm/web test TaskProgressBar TaskDetailPage`
Expected: 型別通過；測試通過（若無 TaskDetailPage 測試則僅跑 TaskProgressBar）。

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/tasks/TaskProgressBar.tsx apps/web/src/features/tasks/TaskProgressBar.test.tsx apps/web/src/features/tasks/TaskDetailPage.tsx
git commit -m "feat(web): window progress bar on task detail"
```

---

## Task 5: Dashboard window 帶狀渲染與逾期整合

window 任務在日曆上以帶狀顯示（schedule-block 帶狀下方再一條），逾期與選定日納入 window。

**Files:**
- Modify: `apps/web/src/features/dashboard/DashboardPage.tsx`

- [ ] **Step 1: import window 純函式 ＋ 計算 windowTasks**

在 DashboardPage 頂部 import 區（約 21-26 行）加入：
```ts
import {
  getWindowTasks,
  getWeekSpans,
  windowState,
  windowOverlapsDate,
} from "@/features/calendar/windows";
```

在 component 內、`calendarTasks` 定義（約 271 行）之後加入：
```ts
  const windowTasks = useMemo(() => getWindowTasks(tasks ?? []), [tasks]);
```

- [ ] **Step 2: 桌面日曆每週加一條 window 帶狀**

在桌面日曆的 `weekSpans`（約 466 行）旁，新增 window 的 span 計算。把該 week 區塊內 `const weekSpans = getWeekBlockSpans(weekCells, scheduleBlocks);` 之後加入：
```ts
                const windowSpans = getWeekSpans(
                  weekCells,
                  windowTasks.map((t) => ({ id: t.id, startDate: t.startDate!, endDate: t.endDate!, task: t })),
                );
```

並在 schedule-block 帶狀 `.map`（約 500-519 行 `{weekSpans.map(...)}`）之後、該週 `</div>`（約 520 行）之前插入 window 帶狀：
```tsx
                    {windowSpans.map((span) => {
                      const t = (span.item as { task: TaskResponse }).task;
                      const isStart = t.startDate! >= weekCells[0]!.key;
                      const isEnd = t.endDate! <= weekCells[6]!.key;
                      const state = windowState(t, todayKey);
                      const tone =
                        state === "overdue"
                          ? "bg-rose-100 border-rose-300 text-rose-900"
                          : state === "done"
                            ? "bg-muted border-border text-muted-foreground line-through"
                            : state === "upcoming"
                              ? "bg-indigo-50 border-indigo-200 text-indigo-500"
                              : "bg-indigo-100 border-indigo-300 text-indigo-900";
                      return (
                        <div key={`w-${t.id}`} className="mt-0.5 grid grid-cols-7 gap-1 h-5">
                          <Link
                            to={`/tasks/${t.id}`}
                            className={`truncate border px-1.5 text-[10px] font-medium leading-5 text-left hover:brightness-95 transition-[filter] ${tone} ${isStart ? "rounded-l-md" : "border-l-0"} ${isEnd ? "rounded-r-md" : "border-r-0"}`}
                            style={{ gridColumn: `${span.colStart + 1} / ${span.colEnd + 2}` }}
                            title={`${t.title} · ${t.startDate} - ${t.endDate} · ${t.progress}%`}
                          >
                            {isStart && `${t.title}（${t.progress}%）`}
                          </Link>
                        </div>
                      );
                    })}
```

> `Link` 已於檔案頂部 import（第 2 行）。`TaskResponse` 已 import（第 3 行）。

- [ ] **Step 3: 選定日卡片納入 window 任務**

在 `selectedScheduleBlocks`（約 309-312 行）之後加入：
```ts
  const selectedWindowTasks = useMemo(
    () => windowTasks.filter((t) => windowOverlapsDate(t, selectedDate)),
    [windowTasks, selectedDate],
  );
```

並在選定日 Card 的 `{selectedScheduleBlocks.length > 0 && (...)}` 區塊（約 624-656 行）之後、`{renderTaskList(selectedTasks, ...)}`（約 657 行）之前插入：
```tsx
            {selectedWindowTasks.length > 0 && (
              <div className="space-y-1" aria-label="當日時間段任務">
                {selectedWindowTasks.map((t) => (
                  <Link
                    key={t.id}
                    to={`/tasks/${t.id}`}
                    className="block rounded-md border border-indigo-200 bg-indigo-50/70 p-2 text-xs hover:bg-indigo-50"
                  >
                    <p className="truncate font-medium">{t.title}（{t.progress}%）</p>
                    <p className="text-muted-foreground">{t.startDate} - {t.endDate}</p>
                  </Link>
                ))}
              </div>
            )}
```

- [ ] **Step 4: 逾期清單納入過了結束日的 window**

把 `overdueTasks`（約 317-323 行）改為同時納入逾期 window：
```ts
  const overdueTasks = useMemo(
    () =>
      calendarTasks
        .filter((task) => task.dueDate && task.dueDate < todayKey && isActiveTask(task))
        .sort(sortDashboardTasks),
    [calendarTasks, todayKey],
  );
  const overdueWindows = useMemo(
    () => windowTasks.filter((t) => windowState(t, todayKey) === "overdue"),
    [windowTasks, todayKey],
  );
```

並把頂部統計列「逾期」數字（約 416 行 `["逾期", overdueTasks.length]`）改為：
```ts
              ["逾期", overdueTasks.length + overdueWindows.length],
```

在逾期 Card（約 660-673 行）的 `{renderTaskList(overdueTasks.slice(0, 4), ...)}` 之後加入 window 逾期列：
```tsx
              {overdueWindows.length > 0 && (
                <div className="space-y-1">
                  {overdueWindows.slice(0, 4).map((t) => (
                    <Link
                      key={t.id}
                      to={`/tasks/${t.id}`}
                      className="block rounded-md border border-rose-200 bg-white/60 p-2 text-xs hover:bg-white"
                    >
                      <p className="truncate font-medium">{t.title}（{t.progress}%）</p>
                      <p className="text-muted-foreground">截止 {t.endDate}</p>
                    </Link>
                  ))}
                </div>
              )}
```

並把逾期 Card 的顯示條件（約 660 行 `{overdueTasks.length > 0 && (`）改為：
```tsx
          {(overdueTasks.length > 0 || overdueWindows.length > 0) && (
```

- [ ] **Step 5: typecheck ＋ 全 web 測試**

Run: `pnpm --filter @ftm/web typecheck && pnpm --filter @ftm/web test`
Expected: 型別通過、全測試綠。

- [ ] **Step 6: 本地視覺驗證**

啟動 `pnpm dev:web:prod`（或本地 API + web），建立一個跨多天的時間段任務，確認：
- 桌面日曆出現橫跨多天的紫色帶狀，起點顯示標題與百分比。
- 詳情頁可拉進度條、100% 後狀態變完成、帶狀變灰刪除線。
- 結束日之前不在逾期；把結束日設成昨天後出現在逾期區。

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/dashboard/DashboardPage.tsx
git commit -m "feat(web): render window task bands with three-stage state on dashboard"
```

---

## Task 6: 整體驗證

- [ ] **Step 1: 全 monorepo typecheck**

Run: `pnpm typecheck`
Expected: 無錯誤。

- [ ] **Step 2: 全測試**

Run: `pnpm --filter @ftm/shared test && pnpm --filter @ftm/web test`
Expected: 全綠。

- [ ] **Step 3: API build dry-run**

Run: `pnpm --filter @ftm/api build`
Expected: 成功。

- [ ] **Step 4: Commit（若有零碎調整）**

```bash
git add -A && git commit -m "chore: window type verification fixes" || echo "nothing to commit"
```

---

## 自我檢查（Spec 覆蓋）

- ✅ window 帶狀橫跨多天 → Task 5（複用 getWeekSpans）。
- ✅ 三段式逾期（開始前不催、區間內進行、過結束日逾期）→ Task 2 `windowState` ＋ Task 5 逾期整合。
- ✅ 開始日前不進「今天/逾期」→ `windowState=upcoming` 不計入逾期；點顯示為帶狀而非今日點。
- ✅ 百分比進度條、可拉動 → Task 4。
- ✅ 100% 與完成同步（雙向）→ Task 1（後端 progress↔status）。
- ✅ 表單選時間段並填區間 → Task 3。
- ✅ 後端持久化 window 欄位 → Task 1。
