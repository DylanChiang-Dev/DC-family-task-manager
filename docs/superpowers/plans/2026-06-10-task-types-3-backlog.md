# Plan 3 — 靈感箱（backlog）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**前置：** 需先完成 Plan 1（`isBacklog` 欄位、校驗跳過時間欄位、shapeTask 已回傳 isBacklog）與 Plan 2（POST/PATCH 已持久化 `isBacklog`）。本計畫**不需任何後端改動**。

**Goal:** 加入「靈感箱」——一個與類型正交的暫存區（`isBacklog=true`）：只需標題即可快速捕捉想法，不進日曆、不催逾期；放在 Dashboard 底部的可收合抽屜；可一鍵「升級」成正式任務（選類型與時間，`isBacklog` 轉為 false，原地轉正保留標題/分類/建立時間）。

**Architecture:** 純前端。靈感箱清單由既有 `useTasks("all")` 結果以 `isBacklog` 過濾得出；快速捕捉用既有 `useCreateTask`；升級重用 `TaskFormDialog`（新增 `promote` 模式，送出時強制 `isBacklog:false`）。一般任務清單與日曆需排除 backlog。降級（任務→靈感箱）依 spec 列為次要，本計畫不做。

**Tech Stack:** TypeScript、React、React Query、Vitest + Testing Library + MSW。

---

## File Structure

**`apps/web/src`**
- Create `features/backlog/BacklogDrawer.tsx` — 底部可收合抽屜：快速捕捉輸入 ＋ 清單 ＋ 升級/刪除。
- Create `features/backlog/BacklogDrawer.test.tsx` — 快速捕捉與升級測試。
- Create `features/backlog/hooks.ts` — `useBacklogTasks`（過濾 isBacklog）。
- Modify `features/tasks/TaskFormDialog.tsx` — 加 `promote` 模式（送出帶 `isBacklog:false`）。
- Modify `features/tasks/TaskListPage.tsx` — 清單排除 backlog。
- Modify `features/dashboard/DashboardPage.tsx` — 底部掛上 `BacklogDrawer`。

---

## Task 1: `useBacklogTasks` 過濾 hook

**Files:**
- Create: `apps/web/src/features/backlog/hooks.ts`
- Test: `apps/web/src/features/backlog/hooks.test.ts`

- [ ] **Step 1: 寫失敗測試（純過濾函式）**

Create `apps/web/src/features/backlog/hooks.test.ts`：
```ts
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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter @ftm/web test backlog/hooks`
Expected: FAIL（模組不存在）。

- [ ] **Step 3: 實作 hook**

Create `apps/web/src/features/backlog/hooks.ts`：
```ts
import type { TaskResponse } from "@ftm/shared";
import { useTasks } from "@/features/tasks/hooks";

export function filterBacklog(tasks: TaskResponse[] | undefined): TaskResponse[] {
  return (tasks ?? []).filter((t) => t.isBacklog);
}

export function useBacklogTasks() {
  const { data, isLoading } = useTasks("all");
  return { backlog: filterBacklog(data), isLoading };
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm --filter @ftm/web test backlog/hooks`
Expected: 2 passed。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/backlog/hooks.ts apps/web/src/features/backlog/hooks.test.ts
git commit -m "feat(web): useBacklogTasks filter hook"
```

---

## Task 2: TaskFormDialog 加 `promote` 模式

升級時送出帶 `isBacklog:false`；非升級的編輯保留原 `isBacklog`。

**Files:**
- Modify: `apps/web/src/features/tasks/TaskFormDialog.tsx`

- [ ] **Step 1: 加入 `promote` prop 與 defaultValues**

在 `TaskFormDialog` 的 props 型別加入 `promote`：
```tsx
export function TaskFormDialog({
  open,
  task,
  promote = false,
  onOpenChange,
}: {
  open: boolean;
  task?: TaskResponse;
  promote?: boolean;
  onOpenChange: (open: boolean) => void;
}) {
```

在 `useForm` 的 `defaultValues` 物件加入：
```ts
      isBacklog: task?.isBacklog ?? false,
```

- [ ] **Step 2: onSubmit 套用 isBacklog**

在 `onSubmit` 組裝 `input` 時加入 `isBacklog`：升級強制 false，否則沿用表單值。
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
      isBacklog: promote ? false : values.isBacklog,
    };
```

- [ ] **Step 3: 升級時標題提示**

把 `DialogTitle`（約第 161 行）改為依 promote 顯示：
```tsx
          <DialogTitle>{promote ? "升級成任務" : isEdit ? "編輯任務" : "新增任務"}</DialogTitle>
```

- [ ] **Step 4: typecheck**

Run: `pnpm --filter @ftm/web typecheck`
Expected: 無錯誤。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/tasks/TaskFormDialog.tsx
git commit -m "feat(web): promote mode in task form sets isBacklog false"
```

---

## Task 3: 靈感箱抽屜元件

底部可收合抽屜：快速捕捉輸入、清單、升級/刪除。

**Files:**
- Create: `apps/web/src/features/backlog/BacklogDrawer.tsx`
- Test: `apps/web/src/features/backlog/BacklogDrawer.test.tsx`

- [ ] **Step 1: 寫失敗測試**

Create `apps/web/src/features/backlog/BacklogDrawer.test.tsx`：
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { BacklogDrawer } from "./BacklogDrawer";

const BASE = "https://family-task-manager-api.5202247.workers.dev/api";

describe("BacklogDrawer", () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: "tok",
      user: null,
      currentTeamId: 1,
      isBootstrapped: true,
    });
  });

  it("quick-captures an idea as a backlog task", async () => {
    let posted: any = null;
    server.use(
      http.get(`${BASE}/tasks`, () => HttpResponse.json({ success: true, data: [] })),
      http.post(`${BASE}/tasks`, async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json({ success: true, data: { id: 9 } }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<BacklogDrawer />);

    await user.type(screen.getByLabelText("捕捉靈感"), "學吉他");
    await user.click(screen.getByRole("button", { name: "加入靈感箱" }));

    await waitFor(() =>
      expect(posted).toMatchObject({ title: "學吉他", isBacklog: true }),
    );
  });

  it("lists backlog items and opens promote dialog", async () => {
    server.use(
      http.get(`${BASE}/tasks`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 1, teamId: 1, title: "整理車庫", description: null, creatorId: 1,
              creatorNickname: "", assigneeId: null, assigneeNickname: null,
              categoryId: null, categoryName: null, categoryColor: null,
              priority: "medium", status: "pending", dueDate: null, taskType: "normal",
              recurrenceConfig: null, parentTaskId: null, startDate: null, endDate: null,
              progress: 0, isBacklog: true, completedAt: null, createdAt: 0, updatedAt: 0,
            },
          ],
        }),
      ),
      http.get(`${BASE}/categories`, () => HttpResponse.json({ success: true, data: [] })),
      http.get(`${BASE}/teams/1/members`, () => HttpResponse.json({ success: true, data: [] })),
    );
    const user = userEvent.setup();
    renderWithProviders(<BacklogDrawer />);

    expect(await screen.findByText("整理車庫")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "升級 整理車庫" }));
    expect(await screen.findByText("升級成任務")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter @ftm/web test BacklogDrawer`
Expected: FAIL（元件不存在）。

- [ ] **Step 3: 實作抽屜**

Create `apps/web/src/features/backlog/BacklogDrawer.tsx`：
```tsx
import { useState } from "react";
import type { TaskResponse } from "@ftm/shared";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { useCreateTask, useDeleteTask } from "@/features/tasks/hooks";
import { TaskFormDialog } from "@/features/tasks/TaskFormDialog";
import { useBacklogTasks } from "./hooks";

export function BacklogDrawer() {
  const { backlog, isLoading } = useBacklogTasks();
  const [open, setOpen] = useState(true);
  const [title, setTitle] = useState("");
  const [promoting, setPromoting] = useState<TaskResponse | null>(null);
  const createMutation = useCreateTask();
  const deleteMutation = useDeleteTask();

  const onCapture = () => {
    const t = title.trim();
    if (!t) return;
    createMutation.mutate(
      { title: t, taskType: "normal", isBacklog: true } as never,
      {
        onSuccess: () => setTitle(""),
        onError: (e) => toast.error(e instanceof ApiError ? e.message : "加入失敗"),
      },
    );
  };

  const onDelete = (task: TaskResponse) => {
    if (!confirm(`從靈感箱刪除「${task.title}」？`)) return;
    deleteMutation.mutate(task.id, {
      onError: (e) => toast.error(e instanceof ApiError ? e.message : "刪除失敗"),
    });
  };

  return (
    <Card className="p-3" aria-label="靈感箱">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">🗂 靈感箱</h2>
          <p className="text-sm text-muted-foreground">先放著的想法，成熟了再升級成任務</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? "收起" : `展開（${backlog.length}）`}
        </Button>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="backlogCapture">捕捉靈感</Label>
              <Input
                id="backlogCapture"
                aria-label="捕捉靈感"
                value={title}
                placeholder="想到什麼，先記下來…"
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onCapture();
                  }
                }}
              />
            </div>
            <Button onClick={onCapture} disabled={createMutation.isPending}>
              加入靈感箱
            </Button>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">載入中...</p>
          ) : backlog.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">靈感箱是空的</p>
          ) : (
            <div className="space-y-2">
              {backlog.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-2 rounded-md border bg-background/70 p-2"
                >
                  <span className="min-w-0 truncate text-sm">{task.title}</span>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      className="h-7 px-2 text-xs"
                      aria-label={`升級 ${task.title}`}
                      onClick={() => setPromoting(task)}
                    >
                      升級
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => onDelete(task)}
                    >
                      刪除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {promoting && (
        <TaskFormDialog
          open
          promote
          task={promoting}
          onOpenChange={(o) => {
            if (!o) setPromoting(null);
          }}
        />
      )}
    </Card>
  );
}
```

> 註：`onCapture` 的 `as never` 是因 `CreateTaskInput` 經 zod `.default()` 後輸入型別與輸出型別略有差異；只送 `title`/`taskType`/`isBacklog`，其餘由後端 schema 預設補齊。若 typecheck 報錯，改以完整欄位物件呼叫（見 Task 5 typecheck 步驟）。

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm --filter @ftm/web test BacklogDrawer`
Expected: 2 passed。

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/backlog/BacklogDrawer.tsx apps/web/src/features/backlog/BacklogDrawer.test.tsx
git commit -m "feat(web): backlog drawer with quick-capture and promote"
```

---

## Task 4: 一般清單排除 backlog ＋ Dashboard 掛上抽屜

**Files:**
- Modify: `apps/web/src/features/tasks/TaskListPage.tsx`
- Modify: `apps/web/src/features/dashboard/DashboardPage.tsx`

- [ ] **Step 1: TaskListPage 過濾掉 backlog**

在 `apps/web/src/features/tasks/TaskListPage.tsx`，把渲染清單的 `tasks.map(...)`（約 69-80 行）改為先過濾。將：
```tsx
      ) : tasks && tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((t) => (
```
改為：
```tsx
      ) : tasks && tasks.filter((t) => !t.isBacklog).length > 0 ? (
        <div className="space-y-3">
          {tasks.filter((t) => !t.isBacklog).map((t) => (
```

- [ ] **Step 2: Dashboard 底部掛上 BacklogDrawer**

在 `apps/web/src/features/dashboard/DashboardPage.tsx` 頂部 import 區加入：
```ts
import { BacklogDrawer } from "@/features/backlog/BacklogDrawer";
```

在最外層 `<div className="w-full min-w-0 space-y-4">` 內、`grid` 區塊（約 437-690 行 `<div className="grid ...">...</div>`）之後、各 Dialog（約 692 行 `{creating && ...}`）之前插入：
```tsx
      <BacklogDrawer />
```

- [ ] **Step 3: typecheck ＋ 測試**

Run: `pnpm --filter @ftm/web typecheck && pnpm --filter @ftm/web test`
Expected: 型別通過、全測試綠。

> 若 Task 3 的 `as never` 造成 typecheck 問題，改用完整物件呼叫 `createMutation.mutate`：
> ```ts
> createMutation.mutate({
>   title: t, description: null, priority: "medium", status: "pending",
>   taskType: "normal", recurrenceConfig: null, startDate: null, endDate: null,
>   progress: 0, isBacklog: true,
> }, { ... });
> ```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/tasks/TaskListPage.tsx apps/web/src/features/dashboard/DashboardPage.tsx
git commit -m "feat(web): mount backlog drawer, exclude backlog from task list"
```

---

## Task 5: 整體驗證

- [ ] **Step 1: 全 monorepo typecheck**

Run: `pnpm typecheck`
Expected: 無錯誤。

- [ ] **Step 2: 全測試**

Run: `pnpm --filter @ftm/shared test && pnpm --filter @ftm/web test`
Expected: 全綠。

- [ ] **Step 3: API build dry-run**

Run: `pnpm --filter @ftm/api build`
Expected: 成功。

- [ ] **Step 4: 本地視覺驗證**

啟動本地 web，於 Dashboard 底部：
- 在「捕捉靈感」輸入並加入，確認項目出現在靈感箱、且**不**出現在日曆或任務清單。
- 點某項「升級」，對話框標題為「升級成任務」，選類型（如時間段）填日期後儲存，確認該項離開靈感箱、變成正式任務出現在對應視圖。

- [ ] **Step 5: 三計畫整合最終把關**

Run: `cd /Users/dc/Documents/DylanChiang-Dev/DC-family-task-manager && grep -rn "repeatable\|expandRecurringTasks\|\.frequency" packages apps/web/src apps/api/src`
Expected: 無輸出。

提醒使用者：三個計畫全部完成後，部署需先 `pnpm --filter @ftm/api db:migrate:remote`（套用 Plan 1 的 0003 遷移）再 `pnpm --filter @ftm/api deploy`。

---

## 自我檢查（Spec 覆蓋）

- ✅ 靈感箱為 `isBacklog` 旗標、與類型正交 → Plan 1 欄位 ＋ 本計畫前端。
- ✅ 只需標題即可快速捕捉、不進日曆/不催逾期 → Task 3 快速捕捉；日曆過濾（Plan 1 `toCalendarTasks` 依 dueDate、Plan 2 `getWindowTasks` 排除 backlog）；清單排除（Task 4）。
- ✅ 底部可收合抽屜 → Task 3、Task 4。
- ✅ 一鍵升級、選類型/時間、原地轉正、isBacklog→false → Task 2 promote ＋ Task 3 升級入口。
- ✅ 降級（次要）→ 依 spec 不在本計畫範圍（YAGNI），未來可加。
