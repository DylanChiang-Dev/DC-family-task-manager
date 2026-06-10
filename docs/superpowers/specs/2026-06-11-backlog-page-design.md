# 靈感箱獨立頁面（Backlog Page）設計

日期：2026-06-11
狀態：已批准

## 背景與目標

靈感箱目前以 `BacklogDrawer` 元件嵌在工作台（`DashboardPage`）最底部，入口不顯眼且讓首頁過長。目標：把靈感箱改為獨立頁面 `/backlog`，從導航欄直接進入，並從首頁移除。

## 方案決策

- 採用「新建 `BacklogPage`」方案：把 `BacklogDrawer` 的邏輯搬進新頁面元件，**移除「收起／展開」toggle**（整頁即靈感箱，toggle 失去意義）。
- 不重新設計成 table/list view（YAGNI）。
- 手機底部導航由 5 格改為 **6 格**（用戶已確認）。

## 變更明細

### 1. 新頁面 `apps/web/src/features/backlog/BacklogPage.tsx`

內容沿用 `BacklogDrawer` 現有邏輯，去掉 toggle 狀態：

- 標題列：「🗂 靈感箱」＋副標題「先放著的想法，成熟了再升級成任務」
- 快速捕捉輸入框（Enter 直接加入，呼叫 `useCreateTask`，`isBacklog: true`）
- 靈感清單：每項顯示標題＋「升級」（開 `TaskFormDialog` promote 模式）＋「刪除」（confirm 後 `useDeleteTask`）
- 載入中與空狀態提示維持現有文案
- 資料來源維持 `useBacklogTasks()`（`features/backlog/hooks.ts`，不改動）

### 2. 路由 `apps/web/src/app/router.tsx`

在 `AppLayout` children 中加入：

```tsx
{ path: "/backlog", element: <BacklogPage /> }
```

### 3. 導航 `apps/web/src/components/AppLayout.tsx`

- `NAV_ITEMS` 在「工作台」之後加入 `{ to: "/backlog", label: "靈感箱" }`
  - 桌面導航順序：工作台／靈感箱／團隊／分類／我的
  - 手機導航（由 `MOBILE_NAV_ITEMS` 推導）順序：工作台／通知／靈感箱／團隊／分類／我的
- 手機底部導航 `grid-cols-5` 改為 `grid-cols-6`

### 4. 首頁 `apps/web/src/features/dashboard/DashboardPage.tsx`

移除 `<BacklogDrawer />` 引用與 import。

### 5. 舊元件處置

`BacklogDrawer.tsx` 不再被任何頁面引用，連同 `BacklogDrawer.test.tsx` 一併刪除；其測試斷言遷移到 `BacklogPage.test.tsx`。

## 測試

- `BacklogPage.test.tsx`：沿用 `BacklogDrawer.test.tsx` 的案例（捕捉、升級、刪除、空狀態、載入中），去掉收起/展開相關斷言。
- `router.test.tsx`：若有路由覆蓋測試，補 `/backlog` 路由可達的斷言。
- `DashboardPage.test.tsx`：移除（如有）對靈感箱區塊的斷言。

## 錯誤處理

維持現狀：mutation 失敗以 `toast.error` 顯示 `ApiError.message`，無其他新增錯誤路徑。

## 不做的事

- 不改 API、不改 `useBacklogTasks` hook、不改 `TaskFormDialog`。
- 不重新設計清單樣式或加排序／篩選功能。
