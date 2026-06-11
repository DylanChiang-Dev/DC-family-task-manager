# 項目甘特面板（ProjectGanttPanel）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dashboard 日曆上方新增與 6 週可視範圍對齊的項目甘特面板，並把項目從日曆格/帶狀行中徹底移除。

**Architecture:** 純前端。新組件 `ProjectGanttPanel`（含可單測的純函數 `ganttGeometry`/`selectGanttProjects`）按日期線性映射到 42 天軸做 CSS 百分比定位；`getWindowTasks` 還原為只認 `window`，項目自動從 Dashboard 帶狀行與月曆頁消失。

**Tech Stack:** React + Tailwind、react-router `Link`、Vitest + Testing Library + MSW。

**Spec:** `docs/superpowers/specs/2026-06-11-project-gantt-panel-design.md`

---

## File Structure

| 文件 | 動作 | 職責 |
|---|---|---|
| `apps/web/src/features/dashboard/ProjectGanttPanel.tsx` | Create | 甘特面板組件 + `ganttGeometry`/`selectGanttProjects` 純函數 |
| `apps/web/src/features/dashboard/ProjectGanttPanel.test.tsx` | Create | 幾何計算、項目篩選、渲染、空狀態測試 |
| `apps/web/src/features/dashboard/DashboardPage.tsx` | Modify | 接入面板；還原 windowSpans 的琥珀項目分支 |
| `apps/web/src/features/dashboard/DashboardPage.test.tsx` | Modify | 甘特斷言替換舊琥珀帶斷言 |
| `apps/web/src/features/calendar/windows.ts` | Modify | `getWindowTasks` 還原為只認 window |
| `apps/web/src/features/calendar/windows.test.ts` | Modify | 還原 + 明確斷言 project 被排除 |
| `apps/web/src/features/calendar/CalendarPage.test.tsx` | Modify | 「項目鋪格」測試反轉為「項目不出現」 |

**關鍵背景（執行者必讀）：**

- Dashboard 的日曆是**滾動 6 週**：`calendarWindow(anchorDate)` 返回 `{start, end}`，`start` = anchor 當天 00:00、`end` = start+41 天。翻頁按鈕改 `anchorDate`。甘特軸必須用同一個 `start`。
- `TaskResponse.projectStats` 形如 `{ total, completed, progress } | null`，project 類型在 GET 列表響應中保證非 null（仍防禦性 `?? 0`）。
- 上一輪實驗性呈現（將被移除）：`getWindowTasks` 含 project、Dashboard windowSpans 有琥珀色 project 分支、CalendarPage 的 rangeTasks 鋪格——rangeTasks 來自 `getWindowTasks`，還原它即可，CalendarPage 代碼不用動。
- web 測試 MSW 為 `onUnhandledRequest: "error"`；ProjectGanttPanel 是純展示組件（數據由 props 傳入），測試不需要 mock 網路。

---

### Task 1: ProjectGanttPanel 組件（TDD）

**Files:**
- Create: `apps/web/src/features/dashboard/ProjectGanttPanel.tsx`
- Test: `apps/web/src/features/dashboard/ProjectGanttPanel.test.tsx`

- [ ] **Step 1: 寫失敗測試**

創建 `apps/web/src/features/dashboard/ProjectGanttPanel.test.tsx`：

```tsx
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import type { TaskResponse } from "@ftm/shared";
import { renderWithProviders } from "@/test/test-utils";
import { ganttGeometry, selectGanttProjects, ProjectGanttPanel } from "./ProjectGanttPanel";

function mk(p: Partial<TaskResponse>): TaskResponse {
  return {
    id: 1, teamId: 1, title: "t", description: null, creatorId: 1, creatorNickname: "",
    assigneeId: null, assigneeNickname: null, categoryId: null, categoryName: null,
    categoryColor: null, priority: "medium", status: "pending", dueDate: null,
    taskType: "project", recurrenceConfig: null, parentTaskId: null, projectId: null,
    projectStats: { total: 20, completed: 8, progress: 40 },
    startDate: "2026-06-11", endDate: "2026-07-11", progress: 0, isBacklog: false,
    completedAt: null, createdAt: 0, updatedAt: 0, ...p,
  };
}

describe("ganttGeometry", () => {
  // 窗口 2026-06-11 起共 42 天（至 7/22）
  it("maps an in-range project to left/width percentages", () => {
    const g = ganttGeometry("2026-06-11", "2026-06-11", "2026-07-11");
    expect(g.overLeft).toBe(false);
    expect(g.overRight).toBe(false);
    expect(g.leftPct).toBeCloseTo(0);
    // 6/11..7/11 = 31 天 → 31/42
    expect(g.widthPct).toBeCloseTo((31 / 42) * 100, 5);
  });

  it("clamps a project starting before the window and flags overLeft", () => {
    const g = ganttGeometry("2026-06-11", "2026-06-01", "2026-06-20");
    expect(g.overLeft).toBe(true);
    expect(g.leftPct).toBeCloseTo(0);
    // 6/11..6/20 = 10 天
    expect(g.widthPct).toBeCloseTo((10 / 42) * 100, 5);
  });

  it("clamps a project ending after the window and flags overRight", () => {
    const g = ganttGeometry("2026-06-11", "2026-07-01", "2026-08-30");
    expect(g.overRight).toBe(true);
    // 7/1 是第 20 格（0-based）→ left 20/42；7/1..7/22 = 22 天
    expect(g.leftPct).toBeCloseTo((20 / 42) * 100, 5);
    expect(g.widthPct).toBeCloseTo((22 / 42) * 100, 5);
  });
});

describe("selectGanttProjects", () => {
  it("keeps active in-window projects, drops others", () => {
    const out = selectGanttProjects(
      [
        mk({ id: 1 }),
        mk({ id: 2, taskType: "normal" }),
        mk({ id: 3, status: "completed" }),
        mk({ id: 4, status: "cancelled" }),
        mk({ id: 5, isBacklog: true }),
        mk({ id: 6, startDate: null }),
        mk({ id: 7, startDate: "2026-01-01", endDate: "2026-02-01" }), // 窗口前已結束
        mk({ id: 8, startDate: "2026-06-01", endDate: "2026-08-30" }), // 兩端超出但重疊
      ],
      "2026-06-11",
    );
    expect(out.map((t) => t.id)).toEqual([1, 8]);
  });
});

describe("ProjectGanttPanel", () => {
  const start = new Date("2026-06-11T00:00:00");

  it("renders bars with title, progress and link", () => {
    renderWithProviders(
      <ProjectGanttPanel tasks={[mk({ id: 4, title: "寫書" })]} start={start} todayKey="2026-06-11" />,
    );

    expect(screen.getByText("進行中項目")).toBeInTheDocument();
    expect(screen.getByText(/寫書 · 40%（8\/20 任務）/)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/tasks/4");
    expect(screen.getByTestId("gantt-today-line")).toBeInTheDocument();
  });

  it("marks out-of-range projects with arrows", () => {
    renderWithProviders(
      <ProjectGanttPanel
        tasks={[mk({ id: 5, title: "學鋼琴", startDate: "2026-06-01", endDate: "2026-08-30", projectStats: { total: 20, completed: 3, progress: 15 } })]}
        start={start}
        todayKey="2026-06-11"
      />,
    );

    expect(screen.getByText(/←/)).toBeInTheDocument();
    expect(screen.getByText(/→ 8\/30/)).toBeInTheDocument();
  });

  it("renders nothing when no active projects", () => {
    const { container } = renderWithProviders(
      <ProjectGanttPanel tasks={[mk({ id: 3, status: "completed" })]} start={start} todayKey="2026-06-11" />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter @ftm/web test -- ProjectGanttPanel`
Expected: FAIL —— 模塊 `./ProjectGanttPanel` 不存在。

- [ ] **Step 3: 實現組件**

創建 `apps/web/src/features/dashboard/ProjectGanttPanel.tsx`：

```tsx
import type { TaskResponse } from "@ftm/shared";
import { formatDateKey } from "@ftm/shared";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";

const WINDOW_DAYS = 42;

// 固定調色盤，按 project.id % 5 取色（跨會話穩定）
const PALETTE = [
  { track: "bg-amber-100 dark:bg-amber-500/20", fill: "bg-amber-400/70 dark:bg-amber-400/40", border: "border-amber-300 dark:border-amber-500/40", text: "text-amber-950 dark:text-amber-100" },
  { track: "bg-violet-100 dark:bg-violet-500/20", fill: "bg-violet-400/70 dark:bg-violet-400/40", border: "border-violet-300 dark:border-violet-500/40", text: "text-violet-950 dark:text-violet-100" },
  { track: "bg-cyan-100 dark:bg-cyan-500/20", fill: "bg-cyan-400/70 dark:bg-cyan-400/40", border: "border-cyan-300 dark:border-cyan-500/40", text: "text-cyan-950 dark:text-cyan-100" },
  { track: "bg-rose-100 dark:bg-rose-500/20", fill: "bg-rose-400/70 dark:bg-rose-400/40", border: "border-rose-300 dark:border-rose-500/40", text: "text-rose-950 dark:text-rose-100" },
  { track: "bg-emerald-100 dark:bg-emerald-500/20", fill: "bg-emerald-400/70 dark:bg-emerald-400/40", border: "border-emerald-300 dark:border-emerald-500/40", text: "text-emerald-950 dark:text-emerald-100" },
];

/** YYYY-MM-DD 兩鍵之間的天數差（to - from，UTC 解析避免 DST 漂移） */
function dayDiff(fromKey: string, toKey: string): number {
  return Math.round(
    (Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / 86400000,
  );
}

function mdLabel(key: string): string {
  const [, month, day] = key.split("-");
  return `${Number(month)}/${Number(day)}`;
}

/** 起止日期 → 42 天軸上的百分比定位（兩端裁剪 + 超界旗標） */
export function ganttGeometry(windowStartKey: string, startDate: string, endDate: string) {
  const rawStart = dayDiff(windowStartKey, startDate);
  const rawEnd = dayDiff(windowStartKey, endDate);
  const s = Math.max(0, Math.min(WINDOW_DAYS - 1, rawStart));
  const e = Math.max(0, Math.min(WINDOW_DAYS - 1, rawEnd));
  return {
    leftPct: (s / WINDOW_DAYS) * 100,
    widthPct: ((e - s + 1) / WINDOW_DAYS) * 100,
    overLeft: rawStart < 0,
    overRight: rawEnd > WINDOW_DAYS - 1,
  };
}

/** 甘特顯示對象：project 類型、未完結、非靈感箱、日期齊全、與窗口重疊 */
export function selectGanttProjects(tasks: TaskResponse[], windowStartKey: string): TaskResponse[] {
  const windowEnd = dayDiff("1970-01-01", windowStartKey) + WINDOW_DAYS - 1;
  return tasks.filter(
    (t) =>
      t.taskType === "project" &&
      t.status !== "completed" &&
      t.status !== "cancelled" &&
      !t.isBacklog &&
      !!t.startDate &&
      !!t.endDate &&
      dayDiff("1970-01-01", t.startDate) <= windowEnd &&
      t.endDate >= windowStartKey,
  );
}

export function ProjectGanttPanel({
  tasks,
  start,
  todayKey,
}: {
  tasks: TaskResponse[];
  start: Date;
  todayKey: string;
}) {
  const windowStartKey = formatDateKey(start);
  const projects = selectGanttProjects(tasks, windowStartKey);
  if (projects.length === 0) return null;

  const ticks = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i * 7);
    return formatDateKey(d);
  });
  const endKey = (() => {
    const d = new Date(start);
    d.setDate(start.getDate() + WINDOW_DAYS - 1);
    return formatDateKey(d);
  })();
  const todayLeftPct = ((dayDiff(windowStartKey, todayKey) + 0.5) / WINDOW_DAYS) * 100;

  return (
    <Card className="p-4" aria-label="進行中項目甘特">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">進行中項目</h2>
        <p className="text-xs text-muted-foreground">
          與日曆同步：{mdLabel(windowStartKey)} – {mdLabel(endKey)}
        </p>
      </div>
      <div className="grid grid-cols-6 border-b pb-1 text-[10px] text-muted-foreground">
        {ticks.map((t, i) => (
          <span key={t} className={i === 5 ? "text-right" : undefined}>
            {mdLabel(t)}
            {i === 5 ? " →" : ""}
          </span>
        ))}
      </div>
      <div className="relative pt-2">
        {todayLeftPct >= 0 && todayLeftPct <= 100 && (
          <div
            data-testid="gantt-today-line"
            aria-hidden
            className="absolute inset-y-0 z-10 w-0.5 bg-red-500"
            style={{ left: `${todayLeftPct}%` }}
          />
        )}
        {projects.map((p) => {
          const geo = ganttGeometry(windowStartKey, p.startDate!, p.endDate!);
          const color = PALETTE[p.id % PALETTE.length]!;
          const progress = p.projectStats?.progress ?? 0;
          const completed = p.projectStats?.completed ?? 0;
          const total = p.projectStats?.total ?? 0;
          const label = `📖 ${p.title} · ${progress}%（${completed}/${total} 任務）`;
          return (
            <div key={p.id} className="relative mb-2 h-7 last:mb-0">
              <Link
                to={`/tasks/${p.id}`}
                title={`${p.title} · ${p.startDate} → ${p.endDate} · ${progress}%`}
                className={`absolute inset-y-0 overflow-hidden border ${color.track} ${color.border} ${
                  geo.overLeft ? "" : "rounded-l-full"
                } ${geo.overRight ? "" : "rounded-r-full"} hover:brightness-95 dark:hover:brightness-125 transition-[filter]`}
                style={{ left: `${geo.leftPct}%`, width: `${geo.widthPct}%` }}
              >
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 ${color.fill}`}
                  style={{ width: `${progress}%` }}
                />
                <span className={`relative z-10 block truncate px-2 text-[11px] font-medium leading-7 ${color.text}`}>
                  {geo.overLeft ? "← " : ""}
                  {label}
                  {geo.overRight ? ` → ${mdLabel(p.endDate!)}` : ` · ${mdLabel(p.endDate!)} 止`}
                </span>
              </Link>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm --filter @ftm/web test -- ProjectGanttPanel`
Expected: PASS（8 個用例全綠）

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/dashboard/ProjectGanttPanel.tsx apps/web/src/features/dashboard/ProjectGanttPanel.test.tsx
git commit -m "feat(web): add ProjectGanttPanel component with window-aligned bars"
```

---

### Task 2: 接入 DashboardPage

**Files:**
- Modify: `apps/web/src/features/dashboard/DashboardPage.tsx`
- Test: `apps/web/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: 寫失敗測試**

`DashboardPage.test.tsx`（fixture 已有 id=8 的「寫書」project，projectStats progress 40）。把上一輪的舊斷言測試：

```ts
  it("renders project span with 項目 prefix and aggregated progress", async () => {
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("項目 · 寫書（40%）")).toBeInTheDocument();
  });
```

整段替換為：

```ts
  it("renders the gantt panel with project bar and progress", async () => {
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText("進行中項目")).toBeInTheDocument();
    expect(screen.getByText(/寫書 · 40%（2\/5 任務）/)).toBeInTheDocument();
  });
```

注意：fixture 的 projectStats 是 `{ total: 5, completed: 2, progress: 40 }`，文案斷言要對應 `2/5 任務`。

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter @ftm/web test -- DashboardPage`
Expected: 新斷言 FAIL（「進行中項目」不存在）；其餘 PASS。

- [ ] **Step 3: 接入面板**

`DashboardPage.tsx`——import 區加：

```ts
import { ProjectGanttPanel } from "./ProjectGanttPanel";
```

JSX 中，左欄 `section` 的第一個子元素位置（桌面日曆 Card 之前）插入：

```tsx
        <section className="min-w-0 space-y-4 lg:order-1">
          <ProjectGanttPanel tasks={tasks ?? []} start={start} todayKey={todayKey} />
          <Card className="hidden p-4 sm:flex sm:flex-col lg:min-h-[calc(100svh-13rem)]" aria-label="未來 6 週日曆">
```

（`section` 本身無斷點隱藏，桌面與行動版都會看到面板。）

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm --filter @ftm/web test -- DashboardPage`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/dashboard/DashboardPage.tsx apps/web/src/features/dashboard/DashboardPage.test.tsx
git commit -m "feat(web): mount project gantt panel above dashboard calendar"
```

---

### Task 3: 移除舊呈現（帶狀行與月曆鋪格）

**Files:**
- Modify: `apps/web/src/features/calendar/windows.ts`
- Modify: `apps/web/src/features/calendar/windows.test.ts`
- Modify: `apps/web/src/features/dashboard/DashboardPage.tsx`
- Modify: `apps/web/src/features/calendar/CalendarPage.test.tsx`

- [ ] **Step 1: 先改測試（紅）**

**(a)** `windows.test.ts`——`getWindowTasks` 的用例改為斷言 project 被排除：

```ts
describe("getWindowTasks", () => {
  it("keeps only non-backlog window tasks with both dates (projects excluded)", () => {
    const out = getWindowTasks([
      mk({ id: 1, taskType: "window", startDate: "2026-06-10", endDate: "2026-06-20" }),
      mk({ id: 2, taskType: "window", startDate: null, endDate: "2026-06-20" }),
      mk({ id: 3, taskType: "window", startDate: "2026-06-10", endDate: "2026-06-20", isBacklog: true }),
      mk({ id: 4, taskType: "normal" }),
      mk({ id: 5, taskType: "project", startDate: "2026-06-11", endDate: "2026-07-11" }),
    ]);
    expect(out.map((t) => t.id)).toEqual([1]);
  });
});
```

**(b)** `CalendarPage.test.tsx`——把整個 `it("shows a project task on every overlapping day of the month", ...)` 用例（保留其 server.use 數據設置）改名並反轉斷言。替換後的完整用例：

```ts
  it("does not render project tasks in month cells (gantt owns them)", async () => {
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const start = new Date(today);
    start.setDate(today.getDate() - 3);
    const end = new Date(today);
    end.setDate(today.getDate() + 3);
    server.use(
      http.get(`${BASE}/tasks`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 7,
              teamId: 1,
              title: "寫書",
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
              taskType: "project",
              recurrenceConfig: null,
              parentTaskId: null,
              projectId: null,
              projectStats: { total: 0, completed: 0, progress: 0 },
              startDate: iso(start),
              endDate: iso(end),
              progress: 0,
              isBacklog: false,
              completedAt: null,
              createdAt: 0,
              updatedAt: 0,
            },
          ],
        }),
      ),
    );

    renderWithProviders(<CalendarPage />);

    // 等日曆渲染完成（任一日期格出現）再斷言項目不在格中
    expect(await screen.findByText("這天沒有任務")).toBeInTheDocument();
    expect(screen.queryByText("寫書")).not.toBeInTheDocument();
  });
```

**(c)** `DashboardPage.test.tsx`——上一輪在 fixture 加的 project（id 8）保留（甘特測試在用）。無其他斷言要改。

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter @ftm/web test 2>&1 | grep -E "failed|Tests"`
Expected: windows.test（project 仍被包含）與 CalendarPage.test（寫書仍鋪格）共 2 個 FAIL。

- [ ] **Step 3: 還原 getWindowTasks**

`apps/web/src/features/calendar/windows.ts`：

```ts
/** 取出可在日曆顯示的時間段任務（非靈感箱、兩端日期齊全）。項目由甘特面板呈現，不進帶狀行 */
export function getWindowTasks(tasks: TaskResponse[]): TaskResponse[] {
  return tasks.filter(
    (t) => t.taskType === "window" && !t.isBacklog && !!t.startDate && !!t.endDate,
  );
}
```

- [ ] **Step 4: 還原 Dashboard windowSpans 的琥珀分支**

`DashboardPage.tsx` 的 `windowSpans.map` 整塊替換回精簡版（刪除 isProject/accent/amber 分支與 `項目 ·` 前綴）：

```tsx
                    {windowSpans.map((span) => {
                      const t = windowTasks.find((wt) => wt.id === span.item.id)!;
                      const isStart = t.startDate! >= weekCells[0]!.key;
                      const isEnd = t.endDate! <= weekCells[6]!.key;
                      const state = windowState(t, todayKey);
                      const tone =
                        state === "overdue"
                          ? "bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-200"
                          : state === "done"
                            ? "bg-muted border-border text-muted-foreground line-through"
                            : state === "upcoming"
                              ? "bg-indigo-50 border-indigo-200 text-indigo-500 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-300"
                              : "bg-indigo-100 border-indigo-300 text-indigo-900 dark:bg-indigo-500/20 dark:border-indigo-500/40 dark:text-indigo-200";
                      return (
                        <div key={`w-${t.id}`} className="mt-0.5 grid grid-cols-7 gap-1 h-5">
                          <Link
                            to={`/tasks/${t.id}`}
                            className={`truncate border px-1.5 text-[10px] font-medium leading-5 text-left hover:brightness-95 dark:hover:brightness-125 transition-[filter] ${tone} ${isStart ? "rounded-l-md" : "border-l-0"} ${isEnd ? "rounded-r-md" : "border-r-0"}`}
                            style={{ gridColumn: `${span.colStart + 1} / ${span.colEnd + 2}` }}
                            title={`${t.title} · ${t.startDate} - ${t.endDate} · ${t.progress}%`}
                          >
                            {isStart && `${t.title}（${t.progress}%）`}
                          </Link>
                        </div>
                      );
                    })}
```

- [ ] **Step 5: 跑全量測試確認通過**

Run: `pnpm --filter @ftm/web test 2>&1 | grep -E "Tests|Test Files"`
Expected: 全 PASS。

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/calendar/windows.ts apps/web/src/features/calendar/windows.test.ts apps/web/src/features/calendar/CalendarPage.test.tsx apps/web/src/features/dashboard/DashboardPage.tsx
git commit -m "refactor(web): projects render only in gantt panel, not calendar cells or spans"
```

---

### Task 4: 全量驗證與部署

**Files:** 無新改動

- [ ] **Step 1: 全量檢查**

```bash
pnpm typecheck
pnpm --filter @ftm/web test
```

Expected: 全 PASS。

- [ ] **Step 2: 推送（Pages 自動構建部署）**

```bash
git push
```

- [ ] **Step 3: 生產驗證**

刷新 Dashboard：日曆上方出現「進行中項目」甘特卡，「寫書」條從今天延伸到 7/11、條內填充為當前進度；日曆格與帶狀行中不再出現項目；行程帶（天藍）不受影響。
