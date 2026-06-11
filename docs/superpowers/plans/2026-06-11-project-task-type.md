# 項目任務類型（Project Task Type）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `project` 任務類型作為長期項目容器（如「寫一本書」）：子任務經 `projectId` 掛載、進度由子任務自動推算、每日 recurring 任務可歸屬項目。

**Architecture:** 不新增實體——項目就是一筆 `taskType = "project"` 的 task，復用 `startDate`/`endDate`。新增 `tasks.project_id` 自引用外鍵（ON DELETE SET NULL）承載「項目→成員任務」關係，與既有 `parentTaskId`（recurring 模板→實例鏈）正交。進度在 GET 時即時聚合（`GROUP BY project_id`），不落庫。

**Tech Stack:** Drizzle ORM + D1 (SQLite)、Hono、Zod (`@ftm/shared`)、React + TanStack Query、Vitest + Testing Library + MSW。

**Spec:** `docs/superpowers/specs/2026-06-11-project-task-type-design.md`

---

## File Structure

| 文件 | 動作 | 職責 |
|---|---|---|
| `packages/shared/src/constants/enums.ts` | 修改 | `TASK_TYPE` 加 `"project"` |
| `packages/shared/src/schemas/task.ts` | 修改 | `projectId` 欄位 + project 類型跨欄位校驗 |
| `packages/shared/src/schemas/task.test.ts` | 修改 | 新校驗規則的測試 |
| `packages/shared/src/types/api.ts` | 修改 | `TaskResponse` 加 `projectId` / `projectStats` |
| `apps/api/src/db/schema.ts` | 修改 | `tasks.projectId` 自引用 FK + 索引 |
| `apps/api/src/db/migrations/0006_*.sql` | 生成 | `pnpm db:generate` 產出 |
| `apps/api/src/routes/task.ts` | 修改 | shapeTask、驗證、`?projectId=` 篩選、進度聚合 |
| `apps/api/src/services/recurrence.ts` | 修改 | 實例繼承 `projectId`；INSERT_CHUNK_SIZE 8→7 |
| `apps/web/src/features/tasks/api.ts` | 修改 | `TaskListFilter.projectId` |
| `apps/web/src/features/tasks/hooks.ts` | 修改 | `useProjectTasks(projectId)` |
| `apps/web/src/features/tasks/TaskFormDialog.tsx` | 修改 | 「項目」類型、起止日期、「所屬項目」下拉、`defaultProjectId` |
| `apps/web/src/features/tasks/TaskFormDialog.test.tsx` | 修改 | 新表單行為測試 |
| `apps/web/src/features/tasks/TaskCard.tsx` | 修改 | 項目卡片：徽章 + 進度條 + 計數 |
| `apps/web/src/features/tasks/TaskListPage.tsx` | 修改 | 類型篩選器（客戶端過濾） |
| `apps/web/src/features/tasks/TaskListPage.test.tsx` | 修改 | 項目卡片渲染測試 |
| `apps/web/src/features/tasks/TaskDetailPage.tsx` | 修改 | 項目視圖（進度 + 子任務 + 每日節奏）、所屬項目麵包屑 |
| `apps/web/src/features/tasks/TaskDetailPage.test.tsx` | 修改 | 項目視圖 + 麵包屑測試 |

**關鍵背景（執行者必讀）：**

- `parentTaskId` 在本系統專屬 recurring「模板→實例」鏈：代碼以 `taskType === "recurring" && parentTaskId == null` 識別模板。**絕不能**用它掛項目子任務，那是 `projectId` 的職責。
- API 響應一律 `{ success: true, data }` / `{ success: false, error: { code, message } }`（`src/lib/response.ts` 的 `ok()`/`fail()`）。
- API 無自動化測試，靠 `pnpm typecheck` + 手動 curl；shared 與 web 用 Vitest（web 的 MSW 設了 `onUnhandledRequest: "error"`，組件新增的請求必須補 mock，否則既有測試直接炸）。
- D1 限制每條 SQL 最多 100 個綁定參數——recurrence 批量插入每行欄位數增加後必須重算 chunk 大小（Task 6）。

---

### Task 1: shared — 枚舉與 Zod 校驗

**Files:**
- Modify: `packages/shared/src/constants/enums.ts:12`
- Modify: `packages/shared/src/schemas/task.ts`
- Test: `packages/shared/src/schemas/task.test.ts`

- [ ] **Step 1: 寫失敗測試**

在 `packages/shared/src/schemas/task.test.ts` 文件末尾追加：

```ts
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
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter @ftm/shared test`
Expected: FAIL —— `project` 不在 `TASK_TYPE` 枚舉中，`safeParse` 對 `taskType: "project"` 返回 `success: false`，第一個用例先炸。

- [ ] **Step 3: 實現**

`packages/shared/src/constants/enums.ts` 第 12 行：

```ts
export const TASK_TYPE = ["normal", "recurring", "window", "project"] as const;
```

`packages/shared/src/schemas/task.ts`——`taskFields` 內 `parentTaskId` 之後加一行：

```ts
  parentTaskId: z.number().int().positive().nullable().optional(),
  projectId: z.number().int().positive().nullable().optional(),
```

`refineTask` 的 data 參數類型加 `projectId`：

```ts
  data: {
    taskType?: (typeof TASK_TYPE)[number];
    recurrenceConfig?: unknown;
    startDate?: string | null;
    endDate?: string | null;
    progress?: number;
    isBacklog?: boolean;
    parentTaskId?: number | null;
    projectId?: number | null;
  },
```

`refineTask` 函數體內，緊跟在 `const isTemplate = ...` 之後（即 `isBacklog` 早退**之前**，項目結構約束不因靈感箱而豁免）加：

```ts
  if (type === "project") {
    if (data.projectId != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "項目不可掛在其他項目下",
        path: ["projectId"],
      });
    }
    if (data.parentTaskId != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "項目不能成為其他任務的子任務",
        path: ["parentTaskId"],
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
```

注意：既有的「progress 僅 window 可非 0」檢查（`type !== "window"` 即報錯）已天然覆蓋 project，不需要改。

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm --filter @ftm/shared test`
Expected: PASS（既有用例 + 新增 7 個全綠）

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/constants/enums.ts packages/shared/src/schemas/task.ts packages/shared/src/schemas/task.test.ts
git commit -m "feat(shared): add project task type and projectId validation"
```

---

### Task 2: DB schema 與 migration

**Files:**
- Modify: `apps/api/src/db/schema.ts`
- Create（生成）: `apps/api/src/db/migrations/0006_*.sql`

- [ ] **Step 1: 修改 schema**

`apps/api/src/db/schema.ts` 頂部 import 加 `AnySQLiteColumn`（drizzle 自引用外鍵需要顯式返回類型標註，否則 TS 推斷循環）：

```ts
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
```

`tasks` 表 `parentTaskId` 之後加欄位：

```ts
    parentTaskId: integer("parent_task_id"),
    // 項目歸屬（與 parentTaskId 的「模板→實例」鏈正交）；刪項目時子任務自動脫鉤
    projectId: integer("project_id").references((): AnySQLiteColumn => tasks.id, {
      onDelete: "set null",
    }),
```

索引塊加：

```ts
    parentIdx: index("idx_parent").on(t.parentTaskId),
    projectIdx: index("idx_project").on(t.projectId),
```

- [ ] **Step 2: 生成 migration**

Run: `pnpm db:generate`
Expected: 新文件 `apps/api/src/db/migrations/0006_<隨機名>.sql`。打開檢查：應包含給 `tasks` 加 `project_id` 欄位（含 `REFERENCES tasks(id) ON ... set null`）與 `CREATE INDEX idx_project`。drizzle-kit 對 SQLite 若採「重建表再拷貝」方式生成也屬正常，照用。

- [ ] **Step 3: 應用到本地 D1**

Run: `pnpm db:migrate:local`
Expected: `migrations applied successfully` 字樣（或列出 0006 已 apply），無報錯。

- [ ] **Step 4: typecheck**

Run: `pnpm typecheck`
Expected: PASS（此時 API 代碼尚未引用 projectId，僅 schema 變更）

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/db/schema.ts apps/api/src/db/migrations/
git commit -m "feat(api): add tasks.project_id column with self-referencing FK"
```

---

### Task 3: TaskResponse 類型 + shapeTask + 路由欄位透傳

**Files:**
- Modify: `packages/shared/src/types/api.ts`（TaskResponse）
- Modify: `apps/api/src/routes/task.ts`（shapeTask、POST insert、PATCH updateData）

- [ ] **Step 1: 擴展 TaskResponse**

`packages/shared/src/types/api.ts`——`TaskResponse` 介面中 `parentTaskId: number | null;` 之後加：

```ts
  parentTaskId: number | null;
  projectId: number | null;
  /** 僅 project 類型任務非 null；由子任務即時聚合（normal/window、非 cancelled、非 backlog） */
  projectStats: { total: number; completed: number; progress: number } | null;
```

- [ ] **Step 2: shapeTask 輸出新欄位**

`apps/api/src/routes/task.ts` 的 `shapeTask` 加第四個可選參數，返回對象在 `parentTaskId` 之後輸出兩欄：

```ts
function shapeTask(
  t: typeof tasks.$inferSelect,
  userMap: Map<number, { username: string; nickname: string }>,
  catMap: Map<number, { name: string; color: string }>,
  statsMap?: Map<number, { total: number; completed: number; progress: number }>,
): TaskResponse {
```

```ts
    parentTaskId: t.parentTaskId,
    projectId: t.projectId,
    projectStats:
      t.taskType === "project" && statsMap
        ? statsMap.get(t.id) ?? { total: 0, completed: 0, progress: 0 }
        : null,
```

（不帶 statsMap 的調用點——POST/PATCH 響應——projectStats 為 null；前端靠 invalidation 重新 GET，無影響。）

- [ ] **Step 3: POST 插入 projectId**

POST `/` 的 `db.insert(tasks).values({...})` 中 `parentTaskId` 之後加：

```ts
      parentTaskId: body.parentTaskId ?? null,
      projectId: body.projectId ?? null,
```

- [ ] **Step 4: PATCH 透傳 projectId**

PATCH `/:id` 的欄位拷貝鏈中，`body.parentTaskId` 塊之後加：

```ts
  if (body.projectId !== undefined && body.projectId !== existing.projectId) {
    updateData.projectId = body.projectId;
    changes.projectId = body.projectId;
  }
```

- [ ] **Step 5: typecheck + commit**

Run: `pnpm typecheck`
Expected: PASS

```bash
git add packages/shared/src/types/api.ts apps/api/src/routes/task.ts
git commit -m "feat(api): thread projectId through task responses and writes"
```

---

### Task 4: POST/PATCH 業務驗證

**Files:**
- Modify: `apps/api/src/routes/task.ts`

- [ ] **Step 1: 加 validateProject helper**

放在既有 `validateCategory` 之後：

```ts
// 驗證 projectId 是否指向同團隊的 project 類型任務
async function validateProject(db: ReturnType<typeof createDb>, teamId: number, projectId: number): Promise<boolean> {
  const p = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, projectId), eq(tasks.teamId, teamId), eq(tasks.taskType, "project")),
    columns: { id: true },
  });
  return !!p;
}
```

- [ ] **Step 2: POST 驗證**

POST `/` 中 categoryId 驗證塊之後加：

```ts
  if (body.projectId) {
    const isValid = await validateProject(db, teamId, body.projectId);
    if (!isValid) {
      return c.json(fail("VALIDATION_ERROR", "所屬項目不存在或不是項目類型"), 400);
    }
  }
```

（`taskType === "project"` 自帶 projectId/parentTaskId 已被 Task 1 的 Zod 規則擋掉，路由不重複檢查。）

- [ ] **Step 3: PATCH 驗證**

PATCH `/:id` 中，緊跟在 `if (finalTaskType !== "recurring" && finalRecurrenceConfig)` 塊之後、progress 兜底檢查之前加：

```ts
  // 項目類型約束：不可嵌套、不可成為子任務；有成員任務時不可改類型
  if (finalTaskType === "project") {
    const finalProjectId = body.projectId !== undefined ? body.projectId : existing.projectId;
    if (finalProjectId != null) {
      return c.json(fail("VALIDATION_ERROR", "項目不可掛在其他項目下"), 400);
    }
    const finalParentId = body.parentTaskId !== undefined ? body.parentTaskId : existing.parentTaskId;
    if (finalParentId != null) {
      return c.json(fail("VALIDATION_ERROR", "項目不能成為其他任務的子任務"), 400);
    }
  }
  if (existing.taskType === "project" && finalTaskType !== "project") {
    const child = await db.query.tasks.findFirst({
      where: and(eq(tasks.projectId, taskId), eq(tasks.teamId, teamId)),
      columns: { id: true },
    });
    if (child) {
      return c.json(fail("VALIDATION_ERROR", "項目下還有任務，請先移除任務歸屬再變更類型"), 400);
    }
  }
  if (body.projectId != null && body.projectId !== existing.projectId) {
    if (body.projectId === taskId) {
      return c.json(fail("VALIDATION_ERROR", "任務不能歸屬自己"), 400);
    }
    const isValid = await validateProject(db, teamId, body.projectId);
    if (!isValid) {
      return c.json(fail("VALIDATION_ERROR", "所屬項目不存在或不是項目類型"), 400);
    }
  }
```

- [ ] **Step 4: typecheck + commit**

Run: `pnpm typecheck`
Expected: PASS

```bash
git add apps/api/src/routes/task.ts
git commit -m "feat(api): validate project assignment and project type constraints"
```

---

### Task 5: GET 篩選與進度聚合

**Files:**
- Modify: `apps/api/src/routes/task.ts`

- [ ] **Step 1: import 加 `sql`**

第 8 行 drizzle-orm import 中補 `sql`：

```ts
import { eq, and, or, inArray, desc, ne, gte, lte, isNotNull, sql, type SQL } from "drizzle-orm";
```

- [ ] **Step 2: 加 loadProjectStats helper**

放在 `validateProject` 之後：

```ts
/** 聚合項目進度：計件子任務 = projectId 指向、normal/window、非 cancelled、非 backlog */
async function loadProjectStats(db: ReturnType<typeof createDb>, projectIds: number[]) {
  const map = new Map<number, { total: number; completed: number; progress: number }>();
  if (projectIds.length === 0) return map;
  const rows = await db
    .select({
      projectId: tasks.projectId,
      total: sql<number>`count(*)`,
      completed: sql<number>`sum(case when ${tasks.status} = 'completed' then 1 else 0 end)`,
    })
    .from(tasks)
    .where(
      and(
        inArray(tasks.projectId, projectIds),
        inArray(tasks.taskType, ["normal", "window"]),
        ne(tasks.status, "cancelled"),
        eq(tasks.isBacklog, false),
      ),
    )
    .groupBy(tasks.projectId);
  for (const r of rows) {
    const completed = r.completed ?? 0;
    map.set(r.projectId!, {
      total: r.total,
      completed,
      progress: r.total > 0 ? Math.round((completed / r.total) * 100) : 0,
    });
  }
  return map;
}
```

- [ ] **Step 3: GET / 支持 ?projectId= 並附帶 stats**

GET `/` handler 內，`offsetParam` 解析塊之後加參數解析：

```ts
  const projectIdParam = c.req.query("projectId");
  let projectIdFilter: number | null = null;
  if (projectIdParam !== undefined) {
    projectIdFilter = Number(projectIdParam);
    if (!Number.isInteger(projectIdFilter) || projectIdFilter < 1) {
      return c.json(fail("VALIDATION_ERROR", "projectId 必須為正整數"), 400);
    }
  }
```

`conds` 組裝處（`if (status) ...` 之後）加：

```ts
  if (projectIdFilter !== null) conds.push(eq(tasks.projectId, projectIdFilter));
```

handler 尾部改為附帶 stats：

```ts
  const userMap = await loadUserMap(db, userIds);
  const catMap = await loadCategoryMap(db, catIds);
  const statsMap = await loadProjectStats(
    db,
    rows.filter((t) => t.taskType === "project").map((t) => t.id),
  );

  return c.json(ok(rows.map((t) => shapeTask(t, userMap, catMap, statsMap))));
```

- [ ] **Step 4: GET /:id 附帶 stats**

GET `/:id` handler 尾部改：

```ts
  const userMap = await loadUserMap(db, userIds);
  const catMap = await loadCategoryMap(db, catIds);
  const statsMap = t.taskType === "project" ? await loadProjectStats(db, [t.id]) : undefined;

  return c.json(ok(shapeTask(t, userMap, catMap, statsMap)));
```

- [ ] **Step 5: typecheck + 手動驗證 + commit**

Run: `pnpm typecheck`
Expected: PASS

手動驗證（需要 `pnpm dev:api` 跑在 :8787，並用既有帳號換取 token；若本地無帳號則跳過，靠 Task 11 全量驗證）：

```bash
# 建項目 → 建兩個子任務（一個完成）→ 看列表 stats
curl -s -X POST http://localhost:8787/api/tasks -H "Authorization: Bearer $TOKEN" -H "X-Team-Id: $TEAM" -H "Content-Type: application/json" \
  -d '{"title":"寫《家庭手冊》","taskType":"project","startDate":"2026-06-11","endDate":"2026-12-31"}'
# 假設返回 id=10
curl -s -X POST http://localhost:8787/api/tasks -H "Authorization: Bearer $TOKEN" -H "X-Team-Id: $TEAM" -H "Content-Type: application/json" \
  -d '{"title":"擬大綱","projectId":10}'
curl -s -X POST http://localhost:8787/api/tasks -H "Authorization: Bearer $TOKEN" -H "X-Team-Id: $TEAM" -H "Content-Type: application/json" \
  -d '{"title":"寫第一章","projectId":10,"status":"completed"}'
curl -s "http://localhost:8787/api/tasks/10" -H "Authorization: Bearer $TOKEN" -H "X-Team-Id: $TEAM"
# Expected: data.projectStats == { "total": 2, "completed": 1, "progress": 50 }
curl -s "http://localhost:8787/api/tasks?projectId=10" -H "Authorization: Bearer $TOKEN" -H "X-Team-Id: $TEAM"
# Expected: data 僅含兩個子任務
```

```bash
git add apps/api/src/routes/task.ts
git commit -m "feat(api): projectId list filter and live project progress aggregation"
```

---

### Task 6: recurring 實例繼承 projectId

**Files:**
- Modify: `apps/api/src/services/recurrence.ts`

- [ ] **Step 1: 修改 chunk 大小與插入欄位**

第 10-11 行——每行欄位從 12 變 13，100 參數上限下每批最多 7 行：

```ts
// D1 上限 100 bound parameters/query；每行 13 欄 → 每批最多 7 行
const INSERT_CHUNK_SIZE = 7;
```

`generateInstancesForTemplate` 的 `toInsert` map 中 `parentTaskId: template.id,` 之後加：

```ts
      parentTaskId: template.id,
      projectId: template.projectId,
```

- [ ] **Step 2: typecheck + commit**

Run: `pnpm typecheck`
Expected: PASS

```bash
git add apps/api/src/services/recurrence.ts
git commit -m "feat(api): recurring instances inherit template projectId"
```

---

### Task 7: web — api 篩選參數與 hooks

**Files:**
- Modify: `apps/web/src/features/tasks/api.ts`
- Modify: `apps/web/src/features/tasks/hooks.ts`

- [ ] **Step 1: TaskListFilter 加 projectId**

`api.ts` 的 `TaskListFilter` 加欄位、`fetchTasks` 加參數設置：

```ts
export interface TaskListFilter {
  /** YYYY-MM-DD，與 to 構成日期重疊過濾（無日期任務會被排除） */
  from?: string;
  /** YYYY-MM-DD */
  to?: string;
  /** 1-500；offset 必須搭配 limit */
  limit?: number;
  offset?: number;
  /** 僅列出歸屬此項目的任務 */
  projectId?: number;
}
```

```ts
  if (filter?.limit != null) params.set("limit", String(filter.limit));
  if (filter?.offset != null) params.set("offset", String(filter.offset));
  if (filter?.projectId != null) params.set("projectId", String(filter.projectId));
```

- [ ] **Step 2: 加 useProjectTasks hook**

`hooks.ts` 中 `useTask` 之後加：

```ts
export function useProjectTasks(projectId: number) {
  const teamId = useAuthStore((s) => s.currentTeamId);

  return useQuery({
    queryKey: ["tasks", teamId, "project", projectId],
    queryFn: () => fetchTasks("all", { projectId }),
    enabled: teamId != null && Number.isFinite(projectId),
  });
}
```

（queryKey 以 `["tasks"]` 開頭，既有 mutation 的 `invalidateQueries({ queryKey: ["tasks"] })` 前綴匹配會自動失效它，勾子任務後項目進度即時刷新。）

- [ ] **Step 3: typecheck + 跑既有測試 + commit**

Run: `pnpm typecheck && pnpm --filter @ftm/web test`
Expected: 全 PASS（純增量，無行為變更）

```bash
git add apps/web/src/features/tasks/api.ts apps/web/src/features/tasks/hooks.ts
git commit -m "feat(web): projectId list filter and useProjectTasks hook"
```

---

### Task 8: TaskFormDialog — 項目類型與所屬項目

**Files:**
- Modify: `apps/web/src/features/tasks/TaskFormDialog.tsx`
- Test: `apps/web/src/features/tasks/TaskFormDialog.test.tsx`

- [ ] **Step 1: 寫失敗測試**

`TaskFormDialog.test.tsx` 改動兩處。

**(a)** `beforeEach` 的 `server.use(...)` 內補一個 GET /tasks handler（對話框即將引入 `useTasks("all")`，MSW 是 `onUnhandledRequest: "error"`，不補既有用例全炸）：

```ts
  server.use(
    http.get(`${BASE}/tasks`, () => HttpResponse.json({ success: true, data: [] })),
    http.get(`${BASE}/categories`, () => HttpResponse.json({ success: true, data: [] })),
```

**(b)** 文件末尾 describe 內追加兩個用例：

```ts
  it("creates a project task with start/end", async () => {
    let posted: unknown = null;
    server.use(
      http.post(`${BASE}/tasks`, async ({ request: req }) => {
        posted = await req.json();
        return HttpResponse.json({ success: true, data: { id: 1 } }, { status: 201 });
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(<TaskFormDialog open onOpenChange={() => {}} />);
    await user.type(screen.getByLabelText("標題"), "寫《家庭手冊》");
    await user.click(screen.getByLabelText("任務類型"));
    await user.click((await screen.findAllByText("項目")).at(-1)!);
    fireEvent.change(screen.getByLabelText("開始日期"), { target: { value: "2026-06-11" } });
    fireEvent.change(screen.getByLabelText("結束日期"), { target: { value: "2026-12-31" } });
    await user.click(screen.getByRole("button", { name: "建立" }));

    await waitFor(() =>
      expect(posted).toMatchObject({
        title: "寫《家庭手冊》",
        taskType: "project",
        startDate: "2026-06-11",
        endDate: "2026-12-31",
      }),
    );
  });

  it("assigns a task to a project via 所屬項目", async () => {
    let posted: unknown = null;
    server.use(
      http.get(`${BASE}/tasks`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: 5,
              teamId: 1,
              title: "寫《家庭手冊》",
              description: null,
              creatorId: 1,
              creatorNickname: "A",
              assigneeId: null,
              assigneeNickname: null,
              categoryId: null,
              categoryName: null,
              categoryColor: null,
              priority: "medium",
              status: "in_progress",
              dueDate: null,
              taskType: "project",
              recurrenceConfig: null,
              parentTaskId: null,
              projectId: null,
              projectStats: { total: 0, completed: 0, progress: 0 },
              startDate: "2026-06-11",
              endDate: "2026-12-31",
              progress: 0,
              isBacklog: false,
              completedAt: null,
              createdAt: 0,
              updatedAt: 0,
            },
          ],
        }),
      ),
      http.post(`${BASE}/tasks`, async ({ request: req }) => {
        posted = await req.json();
        return HttpResponse.json({ success: true, data: { id: 6 } }, { status: 201 });
      }),
    );
    const user = userEvent.setup();

    renderWithProviders(<TaskFormDialog open onOpenChange={() => {}} />);
    await user.type(screen.getByLabelText("標題"), "擬大綱");
    await user.click(screen.getByLabelText("所屬項目"));
    await user.click((await screen.findAllByText("寫《家庭手冊》")).at(-1)!);
    await user.click(screen.getByRole("button", { name: "建立" }));

    await waitFor(() => expect(posted).toMatchObject({ title: "擬大綱", projectId: 5 }));
  });
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter @ftm/web test -- TaskFormDialog`
Expected: 新增 2 個用例 FAIL（找不到「項目」選項 / 找不到「所屬項目」），既有用例 PASS。

- [ ] **Step 3: 實現**

`TaskFormDialog.tsx` 改動六處：

**(a)** import 補 `useTasks`：

```ts
import { useCreateTask, useTasks, useUpdateTask } from "./hooks";
```

**(b)** props 加 `defaultProjectId`：

```tsx
export function TaskFormDialog({
  open,
  task,
  promote = false,
  defaultProjectId,
  onOpenChange,
}: {
  open: boolean;
  task?: TaskResponse;
  promote?: boolean;
  defaultProjectId?: number;
  onOpenChange: (open: boolean) => void;
}) {
```

**(c)** 組件體內（`useTeamMembers` 之後）取項目清單：

```ts
  const { data: allTasks } = useTasks("all");
  const projects = (allTasks ?? []).filter((t) => t.taskType === "project" && t.id !== task?.id);
```

**(d)** `defaultValues` 加：

```ts
      parentTaskId: task?.parentTaskId ?? null,
      projectId: task?.projectId ?? defaultProjectId ?? null,
```

**(e)** 任務類型 Select：`SelectContent` 加項目項；`onValueChange` 的 window 種子日期條件擴成 window|project：

```tsx
                onValueChange={(v) => {
                  const nextType = v as CreateTaskInput["taskType"];
                  setValue("taskType", nextType);
                  setValue(
                    "recurrenceConfig",
                    nextType === "recurring" ? defaultForMode("anchored", "week") : null,
                  );
                  if (nextType === "window" || nextType === "project") {
                    const t = todayISO();
                    if (!watch("startDate")) setValue("startDate", t);
                    if (!watch("endDate")) setValue("endDate", t);
                  }
                }}
```

```tsx
                <SelectContent>
                  <SelectItem value="normal">一般</SelectItem>
                  <SelectItem value="recurring">週期</SelectItem>
                  <SelectItem value="window">時間段</SelectItem>
                  <SelectItem value="project">項目</SelectItem>
                </SelectContent>
```

起止日期區塊條件改為：

```tsx
          {(taskType === "window" || taskType === "project") && (
```

**(f)** 「所屬項目」下拉——放在「指派對象」區塊之後、任務類型 grid 之前（編輯項目自身或週期實例時不顯示；無任何項目時也不顯示）：

```tsx
          {taskType !== "project" && !isInstance && projects.length > 0 && (
            <div className="space-y-1.5">
              <Label>所屬項目</Label>
              <Select
                value={watch("projectId") ? String(watch("projectId")) : "none"}
                onValueChange={(v) => setValue("projectId", v === "none" ? null : Number(v))}
              >
                <SelectTrigger aria-label="所屬項目">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">無</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
```

**(g)** `onSubmit` 的 input 組裝改：

```ts
      startDate: values.taskType === "window" || values.taskType === "project" ? values.startDate || null : null,
      endDate: values.taskType === "window" || values.taskType === "project" ? values.endDate || null : null,
      projectId: values.taskType === "project" ? null : values.projectId || null,
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm --filter @ftm/web test -- TaskFormDialog`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/tasks/TaskFormDialog.tsx apps/web/src/features/tasks/TaskFormDialog.test.tsx
git commit -m "feat(web): project type and project assignment in task form"
```

---

### Task 9: TaskCard 項目展示 + TaskListPage 類型篩選

**Files:**
- Modify: `apps/web/src/features/tasks/TaskCard.tsx`
- Modify: `apps/web/src/features/tasks/TaskListPage.tsx`
- Test: `apps/web/src/features/tasks/TaskListPage.test.tsx`

- [ ] **Step 1: 寫失敗測試**

`TaskListPage.test.tsx` describe 內追加：

```ts
  it("renders a project card with progress and count", async () => {
    const projectTask = {
      ...sampleTask,
      id: 2,
      title: "寫《家庭手冊》",
      taskType: "project",
      projectId: null,
      projectStats: { total: 20, completed: 8, progress: 40 },
      startDate: "2026-06-11",
      endDate: "2026-12-31",
      progress: 0,
      isBacklog: false,
    };
    server.use(
      http.get(`${BASE}/tasks`, () => HttpResponse.json({ success: true, data: [projectTask] })),
    );

    renderWithProviders(<TaskListPage />);

    expect(await screen.findByText("寫《家庭手冊》")).toBeInTheDocument();
    expect(screen.getByText("項目")).toBeInTheDocument();
    expect(screen.getByText("8/20 任務")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter @ftm/web test -- TaskListPage`
Expected: 新用例 FAIL（找不到「項目」徽章與「8/20 任務」）

- [ ] **Step 3: 實現 TaskCard**

`TaskCard.tsx` 頂部 import 加：

```ts
import { TaskProgressBar } from "./TaskProgressBar";
```

標題行 Badge 區（priority Badge 之前）加項目徽章：

```tsx
          <Link className="truncate font-medium underline-offset-4 hover:underline" to={`/tasks/${task.id}`}>
            {task.title}
          </Link>
          {task.taskType === "project" && <Badge>項目</Badge>}
          <Badge variant="secondary">{PRIORITY_LABEL[task.priority]}</Badge>
```

第二行資訊之後（`</div>` 結束 mt-1 那個 div 後面、外層 min-w-0 div 之內）加進度區：

```tsx
        {task.taskType === "project" && task.projectStats && (
          <div className="mt-2 max-w-xs space-y-1">
            <TaskProgressBar value={task.projectStats.progress} readOnly />
            <p className="text-xs text-muted-foreground">
              {task.projectStats.completed}/{task.projectStats.total} 任務
            </p>
          </div>
        )}
```

- [ ] **Step 4: 實現 TaskListPage 類型篩選**

`TaskListPage.tsx`——import 行補 `TaskType`：

```ts
import type { TaskResponse, TaskStatus, TaskType } from "@ftm/shared";
```

`FILTERS` 之後加類型篩選定義：

```ts
type TypeFilter = TaskType | "all";

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "全部類型" },
  { value: "normal", label: "一般" },
  { value: "recurring", label: "週期" },
  { value: "window", label: "時間段" },
  { value: "project", label: "項目" },
];
```

組件內加 state 與過濾（客戶端過濾，列表本就全量拉取）：

```ts
  const [filter, setFilter] = useState<TaskStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
```

```ts
  const visible = (tasks ?? []).filter(
    (t) => !t.isBacklog && (typeFilter === "all" || t.taskType === typeFilter),
  );
```

頂部工具列把狀態 Select 包進一個 flex 容器並加類型 Select：

```tsx
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as TaskStatusFilter)}>
            <SelectTrigger className="w-32" aria-label="篩選狀態">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
            <SelectTrigger className="w-32" aria-label="篩選類型">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreating(true)}>新增任務</Button>
      </div>
```

列表渲染改用 `visible`：

```tsx
      {isLoading ? (
        <p className="text-muted-foreground">載入中...</p>
      ) : visible.length > 0 ? (
        <div className="space-y-3">
          {visible.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onStatusChange={(s) => onStatusChange(t, s)}
              onEdit={() => setEditing(t)}
              onDelete={() => onDelete(t)}
            />
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-muted-foreground">目前沒有任務</p>
      )}
```

- [ ] **Step 5: 跑測試確認通過**

Run: `pnpm --filter @ftm/web test -- TaskListPage`
Expected: 全 PASS（含既有 2 個用例）

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/tasks/TaskCard.tsx apps/web/src/features/tasks/TaskListPage.tsx apps/web/src/features/tasks/TaskListPage.test.tsx
git commit -m "feat(web): project card with progress and task type filter"
```

---

### Task 10: TaskDetailPage 項目視圖與麵包屑

**Files:**
- Modify: `apps/web/src/features/tasks/TaskDetailPage.tsx`
- Test: `apps/web/src/features/tasks/TaskDetailPage.test.tsx`

- [ ] **Step 1: 寫失敗測試**

`TaskDetailPage.test.tsx` describe 內追加兩個用例（沿用文件頂部既有的 `task` 樣本對象）：

```ts
  it("renders project view with progress, children and daily rhythm", async () => {
    const project = {
      ...task,
      id: 9,
      title: "寫《家庭手冊》",
      taskType: "project",
      projectId: null,
      projectStats: { total: 2, completed: 1, progress: 50 },
      startDate: "2026-06-11",
      endDate: "2026-12-31",
      progress: 0,
      isBacklog: false,
    };
    const children = [
      { ...task, id: 11, title: "寫第一章", status: "completed", projectId: 9, projectStats: null, isBacklog: false, progress: 0 },
      { ...task, id: 12, title: "擬大綱", status: "pending", projectId: 9, projectStats: null, isBacklog: false, progress: 0 },
      {
        ...task,
        id: 13,
        title: "每日寫作",
        taskType: "recurring",
        recurrenceConfig: { mode: "interval", every: 1, unit: "day", anchorDate: "2026-06-11" },
        projectId: 9,
        projectStats: null,
        isBacklog: false,
        progress: 0,
      },
    ];
    server.use(
      http.get(`${BASE}/tasks/9`, () => HttpResponse.json({ success: true, data: project })),
      http.get(`${BASE}/tasks`, () => HttpResponse.json({ success: true, data: children })),
      http.get(`${BASE}/tasks/9/comments`, () => HttpResponse.json({ success: true, data: [] })),
      http.get(`${BASE}/tasks/9/history`, () => HttpResponse.json({ success: true, data: [] })),
    );

    renderWithProviders(<Tree />, { route: "/tasks/9" });

    expect(await screen.findByText("寫《家庭手冊》")).toBeInTheDocument();
    expect(await screen.findByText("寫第一章")).toBeInTheDocument();
    expect(screen.getByText("擬大綱")).toBeInTheDocument();
    expect(screen.getByText("已完成 1/2")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("每日節奏")).toBeInTheDocument();
    expect(screen.getByText("每日寫作")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增子任務" })).toBeInTheDocument();
  });

  it("shows parent project breadcrumb on a child task", async () => {
    server.use(
      http.get(`${BASE}/tasks/9`, () =>
        HttpResponse.json({ success: true, data: { ...task, projectId: 5, projectStats: null } }),
      ),
      http.get(`${BASE}/tasks/5`, () =>
        HttpResponse.json({
          success: true,
          data: {
            ...task,
            id: 5,
            title: "寫《家庭手冊》",
            taskType: "project",
            projectId: null,
            projectStats: { total: 1, completed: 0, progress: 0 },
          },
        }),
      ),
      http.get(`${BASE}/tasks/9/comments`, () => HttpResponse.json({ success: true, data: [] })),
      http.get(`${BASE}/tasks/9/history`, () => HttpResponse.json({ success: true, data: [] })),
    );

    renderWithProviders(<Tree />, { route: "/tasks/9" });

    expect(await screen.findByText("倒垃圾")).toBeInTheDocument();
    expect(await screen.findByText(/所屬項目/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "寫《家庭手冊》" })).toBeInTheDocument();
  });
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm --filter @ftm/web test -- TaskDetailPage`
Expected: 新增 2 個用例 FAIL，既有 2 個 PASS。

- [ ] **Step 3: 實現**

`TaskDetailPage.tsx` 改動五處：

**(a)** import 調整：

```tsx
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { TaskStatus } from "@ftm/shared";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";
import {
  useCreateTaskComment,
  useProjectTasks,
  useTask,
  useTaskComments,
  useTaskHistory,
  useUpdateTask,
} from "./hooks";
import { TaskFormDialog } from "./TaskFormDialog";
import { TaskProgressBar } from "./TaskProgressBar";
```

**(b)** 組件頂部 hooks（必須全部在早退 return 之前）：

```tsx
  const id = Number(useParams().id);
  const { data: task, isLoading } = useTask(id);
  // 內聯可選鏈比較才能讓 TS 在真分支收窄 task 非 undefined
  const { data: projectChildren } = useProjectTasks(task?.taskType === "project" ? task.id : Number.NaN);
  const { data: parentProject } = useTask(task?.projectId ?? Number.NaN);
  const { data: comments } = useTaskComments(id);
  const { data: history } = useTaskHistory(id);
  const commentMutation = useCreateTaskComment(id);
  const updateMutation = useUpdateTask();
  const [comment, setComment] = useState("");
  const [addingChild, setAddingChild] = useState(false);
```

（`useTask`/`useProjectTasks` 都有 `Number.isFinite` 的 enabled 守衛，傳 NaN 即不發請求，不會打破 MSW 的 onUnhandledRequest: "error"。）

**(c)** 子任務分組（放在早退 return 之後、JSX return 之前）：

```tsx
  const STATUS_ORDER: Record<TaskStatus, number> = { in_progress: 0, pending: 1, completed: 2, cancelled: 3 };
  const countable = (projectChildren ?? [])
    .filter((t) => (t.taskType === "normal" || t.taskType === "window") && !t.isBacklog)
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  const rhythmTemplates = (projectChildren ?? []).filter(
    (t) => t.taskType === "recurring" && t.parentTaskId == null,
  );
```

**(d)** 麵包屑 + 項目資訊區。標題 `<h1>` 上方（`<div>` 內第一個元素前）加麵包屑：

```tsx
          <div>
            {task.projectId != null && parentProject && (
              <p className="mb-1 text-sm text-muted-foreground">
                所屬項目：
                <Link className="underline-offset-4 hover:underline" to={`/tasks/${parentProject.id}`}>
                  {parentProject.title}
                </Link>
              </p>
            )}
            <h1 className="text-xl font-semibold">{task.title}</h1>
```

既有 window 區塊之後（同層級）加項目進度區：

```tsx
        {task.taskType === "project" && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-sm text-muted-foreground">
              項目期間：{task.startDate ?? "—"} ~ {task.endDate ?? "—"}
            </p>
            <TaskProgressBar value={task.projectStats?.progress ?? 0} readOnly />
            <p className="text-sm text-muted-foreground">
              已完成 {task.projectStats?.completed ?? 0}/{task.projectStats?.total ?? 0}
            </p>
          </div>
        )}
```

**(e)** 子任務卡片——插在主資訊 Card 與「留言」Card 之間：

```tsx
      {task.taskType === "project" && (
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">子任務</h2>
            <Button size="sm" onClick={() => setAddingChild(true)}>
              新增子任務
            </Button>
          </div>
          {countable.length > 0 ? (
            <div className="space-y-2">
              {countable.map((child) => (
                <div key={child.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <input
                    type="checkbox"
                    aria-label={`完成 ${child.title}`}
                    checked={child.status === "completed"}
                    onChange={(e) =>
                      updateMutation.mutate(
                        { id: child.id, input: { status: e.target.checked ? "completed" : "pending" } },
                        { onError: (err) => toast.error(err instanceof ApiError ? err.message : "更新失敗") },
                      )
                    }
                  />
                  <Link
                    className="min-w-0 flex-1 truncate text-sm underline-offset-4 hover:underline"
                    to={`/tasks/${child.id}`}
                  >
                    {child.title}
                  </Link>
                  {child.dueDate && <span className="text-xs text-muted-foreground">{child.dueDate}</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">尚未拆解任務</p>
          )}
          {rhythmTemplates.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <h3 className="text-sm font-medium">每日節奏</h3>
              {rhythmTemplates.map((tpl) => (
                <Link
                  key={tpl.id}
                  className="block truncate text-sm underline-offset-4 hover:underline"
                  to={`/tasks/${tpl.id}`}
                >
                  {tpl.title}
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}
```

頁面最末（歷史 Card 之後、最外層 div 收尾前）加對話框：

```tsx
      {addingChild && (
        <TaskFormDialog open defaultProjectId={task.id} onOpenChange={(o) => !o && setAddingChild(false)} />
      )}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm --filter @ftm/web test -- TaskDetailPage`
Expected: 全 PASS（既有 2 + 新增 2）

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/tasks/TaskDetailPage.tsx apps/web/src/features/tasks/TaskDetailPage.test.tsx
git commit -m "feat(web): project detail view with children, rhythm section and breadcrumb"
```

---

### Task 11: 全量驗證與部署

**Files:** 無新改動（驗證 + 部署）

- [ ] **Step 1: 全量檢查**

```bash
pnpm typecheck
pnpm --filter @ftm/shared test
pnpm --filter @ftm/web test
```

Expected: 全 PASS。任何失敗回到對應 Task 修復後重跑。

- [ ] **Step 2: 本地端到端冒煙**

跑 `pnpm dev:api`（:8787），用 Task 5 Step 5 的 curl 序列對本地 API 驗證：建項目 → 掛 2 個子任務 + 1 個每日 recurring 模板 → `GET /tasks/:id` 確認 `projectStats` 正確 → `GET /tasks?projectId=` 確認 recurring 生成的實例帶 `projectId`。

- [ ] **Step 3: 遷移生產 D1（先於部署，漏遷移會 500）**

```bash
pnpm db:migrate:remote
```

Expected: 0006 migration applied。

- [ ] **Step 4: 部署 API 並推送**

```bash
pnpm --filter @ftm/api deploy   # 腳本已含 --env production（session cookie 行為依賴它）
git push
```

Web 由 Cloudflare Pages 隨 git push 自動構建部署。

- [ ] **Step 5: 生產驗證**

登入生產站：建一個「寫書」項目 → 加子任務與每日寫作 recurring → 確認列表項目卡進度條、詳情頁子任務勾選後進度即時變化、明日 cron 實例歸屬項目（次日驗證）。
