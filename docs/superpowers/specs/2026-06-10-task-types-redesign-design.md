# 任務類型重構設計

- 日期：2026-06-10
- 狀態：待實作
- 範圍：`packages/shared`、`apps/api`、`apps/web`

## 背景與問題

現有三種任務類型 `normal / recurring / repeatable`（定義於 `packages/shared/src/constants/enums.ts`）概念混亂、實作不全：

- `recurring` 只存設定、後端**不產生實例**，且 `recurrenceConfig` 僅支援固定的 daily/weekly/monthly/yearly，無法表達「每10週」「每季」「每5年」。
- `repeatable` 幾乎沒實作——只有 `parentTaskId` 欄位，無 UI、無業務邏輯。
- 三種類型邊界不清，使用者不確定某任務該歸哪一類。

本設計重新定案類型分類，並補完功能。

## 核心概念：兩個正交維度

### 維度一 — 類型（描述時間形狀，三選一）

| 類型 | 語意 | 關鍵欄位 |
|------|------|---------|
| `normal` 一般 | 單次 ＋ 死線 | `dueDate` |
| `recurring` 重複 | 任意間隔、不斷產生實例 | `recurrenceConfig` |
| `window` 時間段 | 單次 ＋ 區間 ＋ 進度 | `startDate`、`endDate`、`progress` |

舊的 `repeatable` 移除。

### 維度二 — 靈感箱（與類型正交的旗標）

- 新增 `isBacklog: boolean`。為 `true` 時：無排程、不進日曆、不催逾期，待在 UI 底部抽屜。
- 用途：突然的想法、不急、可能做也可能不做，放著提醒，成熟後「升級」成正式任務。
- 升級 = 設 `isBacklog=false` ＋ 指定類型與對應時間欄位（原地轉正，保留標題/分類/建立時間）。

## 資料結構

### Schema 變更（`apps/api/src/db/schema.ts`）

```
taskType enum:  "normal" | "recurring" | "window"   （移除 "repeatable"）
recurrenceConfig (json)   — 重新設計，見下
+ startDate (text/date)   — window 用
+ endDate   (text/date)   — window 用
+ progress  (int 0–100)   — window 用，預設 0
+ isBacklog (bool)        — 靈感箱旗標，預設 false
parentTaskId (已存在)      — 重複實例 → 系列模板的連結
```

> 無生產數據，不需遷移腳本：直接改 schema 後 `pnpm db:generate` → `pnpm db:migrate:local`（與 remote）重建即可。

### 重複任務的兩種角色（以既有 `parentTaskId` 區分）

- **系列模板**：`taskType=recurring`、`parentTaskId=null`、持有 `recurrenceConfig`。本身不是要勾的待辦，是「產生器」。
- **實例**：`parentTaskId=<模板 id>`、有具體 `dueDate`、可獨立勾選。日曆上顯示的是實例。

### `recurrenceConfig` 新結構（discriminated union）

```
模式一　interval（單純間隔）
{ mode: "interval", every: N, unit: "day"|"week"|"month"|"year", anchorDate: "YYYY-MM-DD" }
  每10週 = {every:10, unit:"week"}；每5年 = {every:5, unit:"year"}；每季 = {every:3, unit:"month"}
  從 anchorDate 起算，每隔 N 個單位一次。

模式二　anchored（對齊特定日）
{ mode: "anchored", unit: "week"|"month"|"year",
  weekdays?: [1,3,5],      // unit=week：週一三五（0=日）
  dates?: [1,15],          // unit=month：每月 1、15 號
  month?: 5, date?: 31 }   // unit=year：每年 5/31
```

- 每月對齊遇到不存在的日期（如 2 月 30 號）→ 取當月最後一天。

## 機制

### 重複實例產生（cron 每天 01:00 UTC）

於 `apps/api/src/services/` 新增產生邏輯，由 `src/index.ts` 的 `scheduled` handler 觸發（與 `reminder.ts` 並列）。

- 對每個 `recurring` 系列模板，補齊**未來 3 年**時間窗內、尚不存在的實例。
- **保底**：若 3 年窗內一筆都算不出（如每5年），仍先生出**下一筆**，確保系列看得到。
- 每筆實例 = 一個 task row：`parentTaskId=模板 id`、`dueDate=該次時間`、`taskType=recurring`、`status=todo`，繼承模板的標題/分類/指派人。
- 滾動補齊：時間窗每天往前滑，自然補新的；已過去的已完成實例保留作歷史。
- **建立即時體驗**：建立系列當下就同步產生一次（補齊 3 年窗 ＋ 保底），馬上看得到第一筆，不必等 cron。

### 編輯 / 刪除系列

- 編輯模板（改間隔/標題等）→ 只重生**未來未完成**的實例；已完成歷史不動。
- 刪除系列 → 刪除未來未完成實例，保留已完成歷史。
- 單獨改/刪某一筆實例 → 只影響那筆，不回寫模板（脫鉤的一次性例外）。

### 時間段（window）行為

- **帶狀顯示**：日曆上橫跨 `startDate → endDate`，浮在日期格上方的獨立 lane。帶狀填充反映 `progress`。
- **三段式逾期判定**：
  - `startDate` 之前：不出現在「今天要做」清單；日曆可見，呈未啟動樣式。
  - `startDate ~ endDate` 之間：進行中，不催。
  - 過 `endDate` 仍未完成（`progress<100` 且 `status≠done`）：標記逾期。
- **進度**：詳情頁可手動拉進度條；拉到 100% 視為完成，與 `status` 同步（兩者其一達成即完成）。

### 靈感箱（backlog）

- **建立**：`isBacklog=true`，只需標題，時間/類型欄位全可空；不進日曆、不催逾期。
- **位置**：UI 底部可收合抽屜，獨立清單。
- **升級**：抽屜內點某筆 →「升級成任務」→ 表單選類型（normal/recurring/window）並補時間欄位 → 存檔時 `isBacklog=false`，原地轉正。
- **降級（次要）**：已排程任務可丟回靈感箱（`isBacklog=true`、清空排程欄位）。先做升級，降級列為後續。

## 驗證規則（`@ftm/shared` Zod `superRefine`）

```
isBacklog=true   → 不要求任何時間欄位（其餘略過時間相關檢查）
normal           → 需要 dueDate
recurring(模板)  → 需要 recurrenceConfig；不可有 startDate/endDate
window           → 需要 startDate ≤ endDate；不可有 recurrenceConfig
progress         → 僅 window 可非 0
```

Zod schema 為 API 驗證（`@hono/zod-validator`）與前端表單（`react-hook-form` + `@hookform/resolvers`）共同的真實來源。

## 前端呈現（分層日曆版面）

- `TaskFormDialog.tsx`：類型選單改為 `一般 / 重複 / 時間段`，依類型切換欄位區塊：
  - 一般 → `dueDate`
  - 重複 → 模式切換（interval / anchored）＋ 對應輸入（N＋單位，或星期/日期/月日）
  - 時間段 → `startDate`、`endDate`
- 日曆（`features/calendar`）：
  - 頂部帶狀 lane 渲染 window（像全天事件）。
  - 格內渲染 normal 點與 recurring 實例，以顏色/圖示區分。
- **靈感箱抽屜**：底部可收合清單 ＋「升級成任務」入口。
- `TaskCard` / `TaskDetailPage`：顯示類型徽章；window 顯示可拉動進度條；recurring 實例顯示「來自系列 X」連結。
- 「今天」清單過濾：排除 `isBacklog`、排除未到 `startDate` 的 window、排除未來的 recurring 實例。

## 測試

- **API**：各類型建立的驗證（superRefine 分支）、cron 產生實例（3 年窗 ＋ 保底）、建立時即時產生、編輯/刪除系列的實例處理、window 三段式逾期判定。
- **Web**（Vitest + Testing Library + MSW）：表單依類型切換欄位、靈感箱升級流程、日曆帶狀渲染、進度條互動。

## 部署注意

依專案鐵律：schema 變更先 `pnpm db:migrate:remote` 再 `pnpm --filter @ftm/api deploy`，漏跑遷移會導致生產 500。

## 不做（YAGNI）

- 不做 `repeatable` 的舊語意。
- 不做資料遷移腳本（無生產數據）。
- 降級（任務 → 靈感箱）列為次要，可後續再做。
