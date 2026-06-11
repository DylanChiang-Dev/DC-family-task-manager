# 設計：項目甘特面板（ProjectGanttPanel）

日期：2026-06-11
狀態：已通過 brainstorming 確認（視覺方案經瀏覽器 mockup 比選，用戶選定「真甘特」方案 A）
前置：`2026-06-11-project-task-type-design.md`（項目任務類型）

## 背景

項目任務上線後先後嘗試了兩種日曆呈現（窄帶狀行、琥珀色帶 + 前綴），用戶均不滿意：帶狀行與行程帶視覺雷同、擁擠。經 mockup 比選定案：**項目完全移出日曆格，在 Dashboard 日曆上方用一個與日曆時間軸對齊的甘特面板呈現**。

## 設計

### 新組件 `ProjectGanttPanel`

文件：`apps/web/src/features/dashboard/ProjectGanttPanel.tsx`（+ 共置測試）

- **位置**：Dashboard 六週日曆卡正上方，獨立 Card，標題「進行中項目」
- **橫軸**：與日曆可視範圍嚴格同步（`start` → +42 天）。刻度按週標 6 個日期（與日曆每週行一一對應）。翻「前/後 6 週」時甘特隨之平移
- **項目條**：每個項目一行
  - 條的左端/寬度 = 起止日期線性映射到 42 天軸上（CSS 百分比定位）
  - 起點早於可視範圍：左端貼邊、無圓角、顯示 `←`；終點晚於可視範圍：右端貼邊、顯示 `→ M/D`
  - 條內深色填充寬度 = `projectStats.progress`%
  - 文字：`📖 {title} · {progress}%（{completed}/{total} 任務）`，右端顯示 `M/D 止`（未超界時）
  - 整條是 `Link`，點擊跳轉 `/tasks/{id}` 項目詳情頁
- **配色**：固定調色盤（琥珀、紫、青、玫紅、綠）按 `project.id % 5` 取色——同一項目跨會話、跨列表順序顏色恆定。淺色為底、同系深色為進度填充，需適配暗色模式（dark: 半透明變體）
- **今天紅線**：2px 紅色豎線貫穿甘特面板，位置 = 今天在 42 天軸上的百分比（滾動窗口下貼左側）
- **顯示哪些項目**：`taskType === "project"`、`status ∉ {completed, cancelled}`、非 backlog、起止日期齊全、且 `[startDate, endDate]` 與可視範圍重疊
- **空狀態**：無符合條件的項目時整張卡不渲染（`return null`）
- **響應式**：面板渲染在頁面內容頂部（桌面六週日曆卡與行動版日期條之前），桌面/行動共用同一實例，不做斷點分支

### 移除舊呈現

- `apps/web/src/features/calendar/windows.ts`：`getWindowTasks` 還原為只認 `window` 類型（項目不再進帶狀行）
- Dashboard `windowSpans` 自然不再含項目 → 上一版的琥珀帶、`項目 ·` 前綴分支代碼一併刪除
- `CalendarPage`（月曆頁）：項目不再鋪格。實作上 rangeTasks 來自 `getWindowTasks`，還原後自動只剩 window 任務，無需額外改動
- 項目的存在感全部由甘特面板承擔

### 範圍（YAGNI）

- 本期只做 Dashboard；月曆頁不加甘特（需要時另行立項）
- 「今日寫作」等 recurring 實例 chip 維持現狀（屬於「當天要做的事」）
- 不做拖拽調整日期、不做項目排序設置

### 數據

無後端改動。所需數據（`startDate`/`endDate`/`projectStats`）均已在 `GET /tasks` 響應中。

## 測試

- `ProjectGanttPanel.test.tsx`（新）：
  - 條的定位/寬度計算（範圍內、左超界、右超界）
  - 進度填充與文案（`40%（8/20 任務）`）
  - 點擊跳轉連結 href
  - 今天紅線存在
  - 無項目時不渲染
- `DashboardPage.test.tsx`：甘特面板出現（含項目標題與進度文案）；舊「項目 · 」琥珀帶斷言移除/反轉
- 既有測試全量回歸（`pnpm --filter @ftm/web test`）

## 部署

純前端：commit → push，Cloudflare Pages 自動構建。無 migration、無 worker 部署。
