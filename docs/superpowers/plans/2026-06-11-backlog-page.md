# 靈感箱獨立頁面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把靈感箱從工作台底部的 `BacklogDrawer` 改為獨立頁面 `/backlog`，並加入桌面與手機導航。

**Architecture:** 新建 `BacklogPage`（沿用 Drawer 的 hooks 與 mutation 邏輯、移除收起/展開 toggle）→ 註冊路由 → 導航加項（手機底部 nav 改 6 格）→ 從 `DashboardPage` 移除舊元件 → 刪除 `BacklogDrawer`。資料層（`useBacklogTasks`、API）完全不動。

**Tech Stack:** React + React Router + TanStack Query + shadcn/ui + Vitest/Testing Library/MSW。

**Spec:** `docs/superpowers/specs/2026-06-11-backlog-page-design.md`

**測試指令說明:** 單檔測試用 `pnpm --filter @ftm/web test <相對於 apps/web 的路徑>`（vitest run 模式）；全量測試用 `pnpm --filter @ftm/web test`；型別檢查用 `pnpm typecheck`。

---

### Task 1: 建立 `BacklogPage` 元件（TDD）

**Files:**
- Test: `apps/web/src/features/backlog/BacklogPage.test.tsx`（新建）
- Create: `apps/web/src/features/backlog/BacklogPage.tsx`

- [ ] **Step 1: 寫失敗的測試**

新建 `apps/web/src/features/backlog/BacklogPage.test.tsx`。內容是 `BacklogDrawer.test.tsx` 的搬移版（import 與元件名改為 `BacklogPage`），測試案例不變：

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { BacklogPage } from "./BacklogPage";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({
    accessToken: "tok",
    user: null,
    currentTeamId: 1,
    isBootstrapped: true,
  });
});

describe("BacklogPage", () => {
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
    renderWithProviders(<BacklogPage />);

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
    renderWithProviders(<BacklogPage />);

    expect(await screen.findByText("整理車庫")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "升級 整理車庫" }));
    expect(await screen.findByText("升級成任務")).toBeInTheDocument();
  });

  it("shows empty state when backlog is empty", async () => {
    server.use(
      http.get(`${BASE}/tasks`, () => HttpResponse.json({ success: true, data: [] })),
    );
    renderWithProviders(<BacklogPage />);

    expect(await screen.findByText("靈感箱是空的")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter @ftm/web test src/features/backlog/BacklogPage.test.tsx`
Expected: FAIL — 找不到模組 `./BacklogPage`

- [ ] **Step 3: 實作 `BacklogPage`**

新建 `apps/web/src/features/backlog/BacklogPage.tsx`。邏輯與 `BacklogDrawer` 相同，但移除 `open` toggle 狀態與「收起/展開」按鈕，外層由 `Card` 改為頁面容器：

```tsx
import { useState } from "react";
import type { TaskResponse } from "@ftm/shared";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { useCreateTask, useDeleteTask } from "@/features/tasks/hooks";
import { TaskFormDialog } from "@/features/tasks/TaskFormDialog";
import { useBacklogTasks } from "./hooks";

export function BacklogPage() {
  const { backlog, isLoading } = useBacklogTasks();
  const [title, setTitle] = useState("");
  const [promoting, setPromoting] = useState<TaskResponse | null>(null);
  const createMutation = useCreateTask();
  const deleteMutation = useDeleteTask();

  const onCapture = () => {
    const t = title.trim();
    if (!t) return;
    createMutation.mutate(
      { title: t, taskType: "normal", isBacklog: true, progress: 0 } as any,
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
    <div className="mx-auto max-w-2xl space-y-4" aria-label="靈感箱">
      <div>
        <h1 className="text-lg font-semibold">🗂 靈感箱</h1>
        <p className="text-sm text-muted-foreground">先放著的想法，成熟了再升級成任務</p>
      </div>

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
    </div>
  );
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm --filter @ftm/web test src/features/backlog/BacklogPage.test.tsx`
Expected: PASS（3 個測試）

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/backlog/BacklogPage.tsx apps/web/src/features/backlog/BacklogPage.test.tsx
git commit -m "feat(web): standalone BacklogPage component"
```

---

### Task 2: 註冊 `/backlog` 路由（TDD）

**Files:**
- Modify: `apps/web/src/app/router.test.tsx`
- Modify: `apps/web/src/app/router.tsx`

- [ ] **Step 1: 在 `router.test.tsx` 加失敗的測試**

在 `apps/web/src/app/router.test.tsx` 頂部 import 區加：

```tsx
import { BacklogPage } from "@/features/backlog/BacklogPage";
```

在 `describe("router", ...)` 內、現有測試之後加：

```tsx
  it("renders the backlog page at /backlog", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/backlog" element={<BacklogPage />} />
      </Routes>,
      { route: "/backlog" },
    );

    expect(await screen.findByText("🗂 靈感箱")).toBeInTheDocument();
  });
```

注意：此測試依賴 Task 1 已完成（`BacklogPage` 存在）。`beforeEach` 已 mock 了 `GET /tasks` 回空陣列，無需額外 handler。

- [ ] **Step 2: 跑測試**

Run: `pnpm --filter @ftm/web test src/app/router.test.tsx`
Expected: PASS（這個測試本身不經過 `router.tsx`，是渲染驗證；真正的路由註冊在下一步。若 Task 1 未完成會因 import 失敗而 FAIL）

- [ ] **Step 3: 在 `router.tsx` 註冊路由**

修改 `apps/web/src/app/router.tsx`，import 區加：

```tsx
import { BacklogPage } from "@/features/backlog/BacklogPage";
```

在 `AppLayout` 的 `children` 陣列中、`{ path: "/", element: <DashboardPage /> }` 之後加：

```tsx
          { path: "/backlog", element: <BacklogPage /> },
```

- [ ] **Step 4: 型別檢查**

Run: `pnpm typecheck`
Expected: 全部通過，無錯誤

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/router.tsx apps/web/src/app/router.test.tsx
git commit -m "feat(web): register /backlog route"
```

---

### Task 3: 導航加入靈感箱（桌面＋手機 6 格）

**Files:**
- Modify: `apps/web/src/components/AppLayout.tsx`

- [ ] **Step 1: 修改 `NAV_ITEMS`**

把 `apps/web/src/components/AppLayout.tsx` 中：

```tsx
const NAV_ITEMS = [
  { to: "/", label: "工作台" },
  { to: "/teams", label: "團隊" },
  { to: "/categories", label: "分類" },
  { to: "/settings", label: "我的" },
];
```

改為（在「工作台」之後插入靈感箱）：

```tsx
const NAV_ITEMS = [
  { to: "/", label: "工作台" },
  { to: "/backlog", label: "靈感箱" },
  { to: "/teams", label: "團隊" },
  { to: "/categories", label: "分類" },
  { to: "/settings", label: "我的" },
];
```

`MOBILE_NAV_ITEMS` 由 `NAV_ITEMS` 推導（`slice(0, 1)` ＋通知＋ `slice(1)`），不需改動，會自動變成：工作台／通知／靈感箱／團隊／分類／我的（6 項）。

- [ ] **Step 2: 手機底部導航改 6 格**

同檔案中，把：

```tsx
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background sm:hidden">
```

改為：

```tsx
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t bg-background sm:hidden">
```

- [ ] **Step 3: 型別檢查**

Run: `pnpm typecheck`
Expected: 通過

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/AppLayout.tsx
git commit -m "feat(web): backlog nav entry, 6-col mobile nav"
```

---

### Task 4: 從首頁移除靈感箱、刪除 `BacklogDrawer`

**Files:**
- Modify: `apps/web/src/features/dashboard/DashboardPage.tsx:32`（import）與 `:742`（JSX，行號以當前為準）
- Delete: `apps/web/src/features/backlog/BacklogDrawer.tsx`
- Delete: `apps/web/src/features/backlog/BacklogDrawer.test.tsx`

- [ ] **Step 1: 移除 `DashboardPage` 中的引用**

刪除 `apps/web/src/features/dashboard/DashboardPage.tsx` 中這兩處：

import 區（約第 32 行）：

```tsx
import { BacklogDrawer } from "@/features/backlog/BacklogDrawer";
```

JSX（約第 742 行，`</div>` 與 `{creating && ...}` 之間）：

```tsx
      <BacklogDrawer />
```

- [ ] **Step 2: 刪除舊元件與舊測試**

```bash
git rm apps/web/src/features/backlog/BacklogDrawer.tsx apps/web/src/features/backlog/BacklogDrawer.test.tsx
```

（測試斷言已在 Task 1 遷移到 `BacklogPage.test.tsx`，且補了空狀態案例。）

- [ ] **Step 3: 確認無殘留引用**

Run: `grep -rn "BacklogDrawer" apps/web/src`
Expected: 無任何輸出

- [ ] **Step 4: 跑全量測試與型別檢查**

Run: `pnpm typecheck && pnpm --filter @ftm/web test`
Expected: 型別通過、所有測試 PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/dashboard/DashboardPage.tsx
git commit -m "refactor(web): remove BacklogDrawer from dashboard, delete component"
```

（`git rm` 已暫存刪除，這裡只需再 add `DashboardPage.tsx`。）

---

### Task 5: 最終驗證

**Files:** 無新改動

- [ ] **Step 1: 全量檢查**

Run: `pnpm typecheck && pnpm --filter @ftm/web test`
Expected: 全部通過

- [ ] **Step 2: 手動煙測（可選，若環境可用）**

Run: `pnpm dev:web:prod`，瀏覽器開 `http://localhost:5173`：
- 桌面導航出現「靈感箱」，點擊進入 `/backlog`，可捕捉、升級、刪除
- 縮窄視窗（手機寬度）：底部導航 6 格含「靈感箱」
- 首頁底部不再出現靈感箱區塊
