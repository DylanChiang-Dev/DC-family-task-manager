# 設計：項目任務類型（長期項目容器）

日期：2026-06-11
狀態：已通過 brainstorming 確認

## 背景與目標

用戶要開始寫一本書——一個跨度數月、費時的長期項目，需要在系統中立項。釐清後確定三個核心訴求：

1. **整體進度追蹤**：一眼看到「這本書寫到 35% 了」
2. **拆解成可執行的小任務**：「寫第三章」「查資料」等，做完勾掉
3. **每日寫作習慣**：每天一個「今日寫作」任務，勾掉即打卡

明確不需要：項目歸檔聚合、里程碑實體（兩層結構即可）、打卡 streak/熱力圖。

## 方案選型

- **方案 A（選定）**：新增 `project` 任務類型 + `projectId` 欄位
- 方案 B（否決）：純復用 window 任務 + parentTaskId——`parentTaskId` 已被 recurring 模板→實例鏈佔用（代碼以 `parentTaskId == null` 判斷模板），recurring 任務無法掛進項目
- 方案 C（否決）：獨立 `projects` 表——工程量最大，兩層結構用不到其擴展空間

## 數據模型

### 枚舉（`packages/shared/src/constants/enums.ts`）

```ts
export const TASK_TYPE = ["normal", "recurring", "window", "project"] as const;
```

### Schema（`apps/api/src/db/schema.ts` + migration）

`tasks` 表新增：

```ts
projectId: integer("project_id").references(() => tasks.id, { onDelete: "set null" }),
```

加索引 `idx_project`。刪除項目時子任務 `projectId` 自動置空（不級聯刪除）。

### 語義規則

- 項目任務（`taskType = "project"`）復用 `startDate`/`endDate` 表示立項日～目標完成日
- 項目任務自身 `projectId` 必須為 null（不允許項目嵌套，固定兩層）
- 項目任務自身 `parentTaskId` 必須為 null（項目不能成為其他任務的子任務）
- normal、window、recurring 模板均可設 `projectId` 掛進項目
- recurring 模板掛進項目後，cron 生成的每日實例**繼承模板的 `projectId`**；`parentTaskId`（模板→實例）與 `projectId`（項目歸屬）正交，互不干擾

## 進度推算

讀取時即時計算（不落庫，不會不同步）：

- 進度 = 已完成的計件子任務數 ÷ 計件子任務總數 × 100
- **計件子任務** = `projectId` 指向本項目、且 `taskType ∈ {normal, window}` 的任務
- `cancelled` 狀態不計入分母
- recurring 模板及其每日實例**不計入進度**（每日寫作是節奏工具而非進度件，計入則進度永遠達不到 100%）
- `isBacklog = true` 的子任務**不計入進度**（靈感箱裡的還沒立案，移出靈感箱後才計件）
- 無計件子任務時進度為 0%，UI 提示「尚未拆解任務」

## API 變更

### 創建/更新（`apps/api/src/routes/task.ts` + `@ftm/shared` Zod schema）

`createTaskSchema` / `updateTaskSchema` 加可選 `projectId`。驗證規則：

| 規則 | 結果 |
|---|---|
| `projectId` 指向的任務不存在 / 非同 team / 非 project 類型 | 400 |
| `taskType === "project"` 且帶 `projectId` 或 `parentTaskId` | 400 |
| 將已有子任務的項目改為非 project 類型 | 400（需先清空子任務歸屬） |

### 查詢

- `GET /api/tasks` 支持 `?projectId=X` 篩選
- project 類型任務的列表/詳情響應附帶即時聚合的 `projectStats: { total, completed, progress }`（一條 GROUP BY 聚合查詢）

### recurring 實例繼承（`apps/api/src/services/recurrence.ts`）

生成實例時複製模板的 `projectId`（在現有置空 `recurrenceConfig` 的同一處補一行）。

### 刪除

走現有刪除流程；子任務靠 FK `on delete set null` 自動脫鉤，無額外代碼。

## 前端 UI

### 任務表單（`TaskFormDialog.tsx`）

- 類型選單加「項目」；選「項目」時顯示起止日期（復用 window 區間欄位），隱藏「所屬項目」欄位
- 其他類型加可選「所屬項目」下拉（列出本 team 的 project 任務，默認無）

### 任務列表（`TaskListPage.tsx` / `TaskCard.tsx`）

- 項目卡片顯示進度條（復用 `TaskProgressBar`）+「8/20 任務」計數 + 類型徽章
- 類型篩選器加「項目」

### 項目詳情頁（`TaskDetailPage.tsx` 按類型分支渲染，不另建頁面）

- 頂部：大進度條 + `已完成 8/20` + 起止日期
- 中部：子任務列表（按狀態分組：進行中 → 待辦 → 已完成），行內可勾選完成；recurring 模板單獨一節「每日節奏」
- 「新增子任務」按鈕打開 TaskFormDialog 並預填 `projectId`
- 子任務詳情頁顯示「所屬項目」面包屑可跳回

### 每日寫作動線

「今日寫作」實例照常出現在任務列表/今日視圖（recurring 既有行為），勾掉即打卡；同時出現在項目詳情頁「每日節奏」區。

## 測試

跟隨現有 Vitest + Testing Library + MSW 模式：

- **shared**：`projectId` 校驗規則的 schema 測試
- **web**：TaskFormDialog（項目選項、所屬項目下拉）、TaskDetailPage（項目視圖、進度顯示）、TaskListPage（項目卡片）各加用例
- **api**：typecheck + 手動 curl 驗證進度聚合

## 不做（YAGNI）

里程碑實體、打卡 streak/熱力圖、項目歸檔、Dashboard 項目卡片、項目嵌套。需要時再立項。

## 部署注意

按既有流程：`pnpm db:generate` → `pnpm db:migrate:local` 驗證 → `pnpm db:migrate:remote` → `pnpm --filter @ftm/api deploy`（必須 `--env production`）。漏遷移會 500。
