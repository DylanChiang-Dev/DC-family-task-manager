# Tasks: 家庭協作任務管理系統

**Feature Branch**: `001-build-a-web`
**Input**: Design documents from `/specs/001-build-a-web/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 本項目 MVP 階段採用手動測試策略,不生成自動化測試任務

**Organization**: 任務按用戶故事組織,確保每個故事可獨立實施和測試

## Format: `[ID] [P?] [Story] Description`
- **[P]**: 可並行執行（不同文件,無依賴關係）
- **[Story]**: 任務所屬用戶故事（US1, US2, US3, US4, US5, US6）
- 所有描述包含準確文件路徑

## Path Conventions
本項目為單體 Web 應用,採用以下路徑結構:
- 配置: `config/`
- 數據庫: `database/`
- PHP 類庫: `lib/`
- 前端公開目錄: `public/`
- API 端點: `public/api/`
- 樣式表: `public/css/`
- JavaScript: `public/js/`
- 系統腳本: `scripts/`

---

## Phase 1: Setup (專案初始化)

**目的**: 專案結構初始化和基礎配置

- [X] T001 [P] 創建專案目錄結構 (config/, database/, lib/, public/, scripts/, docker/)
- [X] T002 [P] 配置 Docker Compose 環境 (docker-compose.yml, Dockerfile, docker/nginx/default.conf)
- [X] T003 [P] 配置 Git 忽略規則 (.gitignore - 排除 config/database.php, config/installed.lock)
- [X] T004 [P] 創建 README.md 專案介紹文檔
- [X] T005 [P] 創建 CLAUDE.md 技術文檔（開發指南）
- [X] T006 創建 .gitkeep 文件保持空目錄（config/.gitkeep, database/migrations/.gitkeep）

---

## Phase 2: Foundational (阻塞性先決條件)

**目的**: 所有用戶故事依賴的核心基礎設施

**⚠️ 關鍵**: 此階段完成前,任何用戶故事都無法開始實施

### 數據庫基礎架構

- [X] T007 創建完整數據庫架構文件 (database/schema.sql - 包含 7 個核心表)
  - users 表（用戶、密碼哈希、暱稱、當前團隊 ID）
  - teams 表（團隊名稱、6 位邀請碼、創建者）
  - team_members 表（多對多關聯、角色 ENUM）
  - tasks 表（標題、狀態、優先級、截止日期、團隊隔離）
  - categories 表（類別名稱、顏色、團隊 ID）
  - notifications 表（通知類型、內容、是否已讀）
  - task_history 表（審計日誌、變更 JSON）
- [X] T008 [P] 創建數據庫遷移系統腳本 (scripts/migrate.php - 支持 --status, --rollback)
- [X] T009 [P] 創建遷移生成工具 (scripts/make-migration.php)
- [X] T010 [P] 創建示例數據 SQL (database/seed_demo_tasks.sql - 16 個示例任務)

### PHP 核心類庫

- [X] T011 [P] 實現數據庫單例類 (lib/Database.php - PDO Singleton, 持久連接, 支持自定義端口)
- [X] T012 [P] 實現團隊輔助類 (lib/TeamHelper.php)
  - generateInviteCode() - 6 位邀請碼,排除 0,O,I,1
  - isTeamMember($user_id, $team_id) - 成員資格驗證
  - isTeamAdmin($user_id, $team_id) - 管理員權限驗證

### 前端基礎架構

- [X] T013 [P] 創建 CSS 設計系統 (public/css/design-tokens.css - CSS 變量: 顏色、字體、間距、陰影)
- [X] T014 [P] 創建 CSS Reset 和基礎樣式 (public/css/base.css - 現代 CSS Reset, 基礎元素樣式)
- [X] T015 [P] 創建組件樣式庫 (public/css/components.css - .btn, .badge, .task-card, .modal, .dropdown)
- [X] T016 [P] 創建佈局系統 (public/css/layout.css - .container, .grid, .flex, 響應式斷點)
- [X] T017 [P] 創建工具類樣式 (public/css/utilities.css - .text-primary, .rounded-lg, .shadow-md)
- [X] T018 創建主樣式入口 (public/css/style.css - CSS Cascade Layers 導入順序)

### 安裝向導系統

- [X] T019 創建安裝向導入口 (public/install/index.php - 4 步驟流程控制)
- [X] T020 [P] 創建步驟 1: 環境檢查 (public/install/step1.php - PHP 版本、PDO 擴展、文件權限)
- [X] T021 [P] 創建步驟 2: 數據庫配置 (public/install/step2.php - 數據庫連接表單)
- [X] T022 [P] 創建步驟 3: 管理員創建 (public/install/step3.php - 用戶名、密碼、團隊名)
- [X] T023 [P] 創建步驟 4: 完成頁面 (public/install/step4.php - 安裝完成提示)
- [X] T024 [P] 創建環境檢查 API (public/install/check.php - 返回環境檢查 JSON)
- [X] T025 [P] 創建數據庫測試 API (public/install/test_db.php - 測試連接並返回結果)
- [X] T026 [P] 創建數據庫保存 API (public/install/save_db.php - 生成 config/database.php)
- [X] T027 創建安裝執行 API (public/install/install.php - 執行 schema.sql, 創建管理員, 生成 installed.lock)

### 系統工具腳本

- [X] T028 [P] 創建系統更新腳本 (update.sh - Git pull, 遷移執行, 權限設置)
- [X] T029 [P] 創建更新 API (public/api/update.php - GET version/check, POST update)

**Checkpoint**: ✅ 基礎設施就緒 - 用戶故事實施可並行開始

---

## Phase 3: User Story 1 - 創建和管理個人任務 (Priority: P1) 🎯 MVP

**目標**: 家庭成員可快速記錄日常待辦事項,包括設置截止日期、優先級和負責人

**獨立測試**: 用戶註冊登錄後,創建任務「購買牛奶」,設置截止日期為明天,優先級為「高」,分配給自己,完成後標記為已完成

### 認證系統 (US1 依賴)

- [X] T030 [P] [US1] 創建認證 API (public/api/auth.php)
  - POST ?action=register - 註冊用戶（郵箱、密碼 bcrypt cost=10、暱稱）+ 創建/加入團隊
  - POST ?action=login - 登錄驗證並創建 Session
  - POST ?action=logout - 清除 Session
  - GET ?action=check - 檢查登錄狀態
- [X] T031 [P] [US1] 創建登錄頁面 (public/login.php - 登錄/註冊表單、團隊創建/加入選擇)

### 任務 CRUD 核心功能

- [X] T032 [US1] 創建任務 API (public/api/tasks.php)
  - GET - 獲取任務列表（支持 ?status, ?assignee_id, ?priority, ?sort_by 篩選）
  - POST - 創建任務（title 必填, description, assignee_id 默認當前用戶, priority 默認 medium, due_date, category_id）
  - PUT ?id={id} - 更新任務（含樂觀鎖定: 比對 updated_at 時間戳,衝突返回 409）
  - DELETE ?id={id} - 刪除任務（驗證創建者或管理員權限）
- [X] T033 [US1] 創建主應用頁面 (public/index.php)
  - 登錄狀態檢查（未登錄跳轉 login.php,已登錄但未安裝跳轉 install/）
  - 任務列表視圖（標題、狀態、優先級、分配成員、截止日期）
  - 任務創建/編輯模態框（表單包含所有必填/可選字段）
  - 「已完成」和「進行中」標籤頁切換

### 前端交互邏輯

- [X] T034 [US1] 創建主應用 JavaScript (public/js/app.js)
  - 全局狀態管理（currentUser, allTasks, currentFilter, selectedDate）
  - checkLoginStatus() - 頁面加載時檢查登錄狀態
  - loadTasks() - 獲取任務列表並渲染
  - openTaskModal(task) - 打開任務創建/編輯模態框（默認值: assignee=當前用戶, due_date=今天）
  - handleTaskSubmit() - 表單驗證和 API 調用
  - deleteTask(taskId) - 刪除確認對話框 + API 調用
  - renderTaskList() - 渲染任務列表（支持篩選和排序）

### 任務歷史記錄

- [X] T036 [US1] 實現任務歷史記錄功能 (lib/TaskHistoryService.php, public/api/tasks.php)
  - 創建 TaskHistoryService 類：createHistoryRecord($task_id, $user_id, $action, $changes)
  - 在任務 API 中集成歷史記錄：
    - POST 創建任務時：記錄 action='created'
    - PUT 更新任務時：記錄 action='updated', changes={old_value: ..., new_value: ...} (JSON)
    - DELETE 刪除任務時：記錄 action='deleted'
    - 狀態變更時：記錄 action='status_changed'
  - 在任務詳情頁面添加「歷史記錄」標籤頁（可選 UI，Phase 9 實施）
  - 符合 FR-028: 支持查看「誰在何時修改了什麼」

**Checkpoint**: ✅ 此時用戶故事 1 應完全可用且可獨立測試

---

## Phase 4: User Story 2 - 團隊管理與任務分配 (Priority: P2)

**目標**: 家庭成員可將任務分配給特定成員,查看被分配的任務,了解其他成員的任務進度

**獨立測試**: 兩個用戶（媽媽和爸爸）登錄系統,媽媽創建任務「接孩子放學」並分配給爸爸,爸爸登錄後看到被分配的任務,完成後標記完成,媽媽能看到任務狀態變更

### 團隊管理系統

- [X] T037 [P] [US2] 創建團隊 API (public/api/teams.php)
  - GET - 獲取用戶所有團隊列表
  - POST - 創建新團隊（name, 自動生成 invite_code, created_by=當前用戶, 創建者自動成為 admin）
  - POST ?action=join - 加入團隊（通過 invite_code）
  - POST ?action=switch - 切換當前活動團隊（更新 users.current_team_id）
  - PUT ?id={id} - 更新團隊信息（僅管理員）
  - GET ?id={id}&action=members - 獲取團隊成員列表
  - POST ?id={id}&action=regenerate_code - 重新生成邀請碼（僅管理員）
  - DELETE ?id={id}&user_id={uid} - 移除團隊成員（僅管理員）

### 用戶管理系統

- [X] T038 [P] [US2] 創建用戶 API (public/api/users.php)
  - GET - 獲取當前團隊成員列表（僅返回 current_team_id 的成員）
- [X] T039 [P] [US2] 創建個人資料 API (public/api/profile.php)
  - POST - 更新暱稱和密碼（需驗證舊密碼）

### 團隊切換 UI

- [X] T040 [US2] 在主應用中添加團隊切換功能 (public/index.php)
  - 頂部團隊下拉菜單（顯示所有用戶所屬團隊）
  - 設置模態框（Profile/Team 標籤頁）
  - 團隊設置頁（顯示所有團隊的卡片佈局,包含名稱、邀請碼、成員列表、管理操作）
- [X] T041 [US2] 在 app.js 中添加團隊功能 (public/js/app.js)
  - loadTeams() - 獲取所有團隊列表
  - switchCurrentTeam(teamId) - 切換團隊並重新加載數據
  - toggleTeamDropdown() - 點擊式下拉菜單（非 hover）
  - loadTeamSettings() - 加載團隊詳情、成員列表、邀請碼
  - updateTeamName(teamId, name) - 更新團隊名稱（管理員）
  - regenerateInviteCode(teamId) - 重新生成邀請碼（管理員）
  - removeMember(teamId, userId) - 移除團隊成員（管理員）

### 任務分配功能

- [X] T042 [US2] 在任務創建/編輯模態框中添加成員選擇器 (public/index.php)
  - 「分配給」下拉菜單（顯示當前團隊所有成員）
  - 成員頭像和暱稱顯示
- [X] T043 [US2] 在任務列表中添加成員篩選器 (public/index.php)
  - 左側成員篩選欄（顯示團隊成員列表）
  - 點擊成員名稱篩選其任務
  - 「分配給我的任務」/「我創建的任務」/「所有任務」視圖切換

**Checkpoint**: 此時用戶故事 1 和 2 應同時獨立工作

---

## Phase 5: User Story 3 - 日曆視圖與截止日期管理 (Priority: P3)

**目標**: 家庭成員可在日曆中查看任務截止日期分佈,快速了解本週或本月的任務安排

**獨立測試**: 用戶創建 3 個任務,分別設置截止日期為本週一、週三、週五,切換到日曆視圖,驗證任務正確顯示在對應日期,點擊日期查看當天所有任務

### 農曆日曆庫

- [X] T044 [P] [US3] 創建農曆轉換 JavaScript 庫 (public/js/lunar.js)
  - 基準日期: 1900-01-31 = 農曆 1900 年正月初一
  - lunarInfo[] 數組（1900-2100 共 201 個元素,編碼農曆月份天數）
  - solarToLunar(year, month, day) - 公曆轉農曆
  - getYearDays(year) - 獲取農曆年總天數
  - getMonthDays(year, month) - 獲取農曆月份天數

### 日曆視圖 UI

- [X] T045 [US3] 在主應用中添加日曆視圖 (public/index.php)
  - 月曆網格（7 列 × 5-6 行）
  - 每個日期格子顯示農曆日期
  - 任務圓點標記（不同優先級不同顏色）
  - 今天高亮顯示
  - 上一月/下一月導航按鈕
- [X] T046 [US3] 在主應用中添加日曆右側任務面板 (public/index.php)
  - 點擊日期後顯示該日所有任務詳情列表
  - 快速創建任務按鈕（自動填充所選日期為截止日期）
- [X] T047 [US3] 在 app.js 中添加日曆功能 (public/js/app.js)
  - currentMonth 狀態（當前顯示的年月）
  - renderCalendar() - 渲染月曆網格和農曆日期
  - selectDate(year, month, day) - 日期選擇處理器
  - generateRecurringTaskInstances() - 展開週期任務實例（用於日曆顯示）
  - navigateMonth(offset) - 切換月份（+1 或 -1）

### 響應式佈局調整

- [X] T048 [US3] 優化響應式佈局 (public/css/layout.css)
  - 移動端 (<1024px): 隱藏日曆,僅顯示任務列表（全寬）
  - 桌面端 (≥1024px): 日曆（2/3 寬度）+ 任務列表（1/3 寬度）並排
  - 使用 CSS Grid 佈局和 `hidden lg:block` 工具類

### 深色模式切換

- [X] T049 [US3] 在頂部導航添加深色模式切換按鈕 (public/index.php, public/js/app.js)
  - 在頂部導航欄添加月亮/太陽圖標按鈕（Material Symbols: dark_mode / light_mode）
  - 點擊切換 `<html>` 元素的 `.dark` 類
  - 保存用戶偏好到 LocalStorage（key: 'theme', value: 'light'|'dark'|'auto'）
  - 頁面加載時讀取偏好：
    - 'light': 移除 .dark 類
    - 'dark': 添加 .dark 類
    - 'auto': 使用 `prefers-color-scheme` 媒體查詢自動檢測
  - 符合 FR-018: 自動檢測 + 手動切換

**Checkpoint**: 所有 3 個用戶故事應獨立功能完整

---

## Phase 6: User Story 4 - 優先級與分類管理 (Priority: P4)

**目標**: 家庭成員可按優先級（高/中/低）標記任務,並按類別（家務、購物、財務等）組織任務

**獨立測試**: 用戶創建 5 個任務,為其中 2 個設置優先級為「高」、1 個為「中」、2 個為「低」,創建「家務」和「購物」兩個類別,將任務分配到不同類別,使用優先級篩選器僅顯示「高優先級」任務

### 類別管理系統

- [X] T050 [P] [US4] 創建類別 API (public/api/categories.php)
  - GET - 獲取團隊類別列表（僅當前團隊）
  - POST - 創建類別（name 必填, color HEX 格式默認 #3B82F6, 僅管理員）
  - PUT ?id={id} - 更新類別（name, color, 僅管理員）
  - DELETE ?id={id} - 刪除類別（僅管理員, 任務的 category_id 設為 NULL）

### 類別管理 UI

- [X] T051 [US4] 在設置模態框中添加類別管理標籤頁 (public/index.php)
  - 類別列表（顯示名稱、顏色標記、創建者）
  - 添加類別表單（僅管理員可見）
  - 編輯/刪除類別操作（僅管理員）
- [X] T052 [US4] 在任務創建/編輯模態框中添加類別選擇器 (public/index.php)
  - 類別下拉菜單（顯示顏色標記 + 名稱）
  - 允許留空（任務可不選擇類別）
  - 註：JavaScript 整合待 T053-T055 完成後統一實施

### 優先級和類別篩選

- [X] T053 [US4] 在任務列表中添加優先級篩選器 (public/index.php)
  - 優先級徽章（高=紅色、中=黃色、低=綠色）
  - 優先級篩選按鈕（高/中/低/全部）
- [X] T054 [US4] 在任務列表中添加類別導航欄 (public/index.php)
  - 左側類別列表（顯示顏色標記 + 名稱）
  - 點擊類別名稱篩選該類別任務
  - 「全部任務」選項

### 排序功能

- [X] T055 [US4] 在 app.js 中添加排序功能 (public/js/app.js)
  - 支持按優先級排序（高 → 中 → 低）
  - 支持按截止日期排序（升序/降序）
  - 支持按創建時間排序（最新/最舊）
  - 支持按最後修改時間排序

**Checkpoint**: 用戶故事 1-4 應全部獨立工作

---

## Phase 7: User Story 5 - 任務通知與提醒 (Priority: P5)

**目標**: 家庭成員可在任務即將到期時收到提醒通知,避免遺漏重要任務

**獨立測試**: 用戶創建任務並設置截止日期為 1 小時後,啟用「到期提醒」選項,1 小時後系統發送瀏覽器推送通知,用戶收到通知並可點擊通知直接打開任務詳情

**注意**: 此功能在 MVP (v1.0.0) 範圍外,列入路線圖。以下任務為未來實施預留。

### 通知系統後端

- [X] T056 [P] [US5] 創建通知 API (public/api/notifications.php)
  - GET - 獲取未讀通知列表
  - POST ?action=mark_read&id={id} - 標記通知為已讀
  - POST ?action=mark_all_read - 標記所有通知為已讀
- [X] T057 [P] [US5] 創建通知生成服務 (lib/NotificationService.php)
  - createNotification($user_id, $type, $task_id, $content) - 創建通知記錄
  - sendDueReminder($task_id) - 到期提醒通知
  - sendTaskAssigned($task_id) - 任務分配通知
  - sendStatusChanged($task_id) - 狀態變更通知

### 瀏覽器推送通知

- [X] T058 [US5] 在 app.js 中添加 Web Push API 集成 (public/js/app.js)
  - 請求瀏覽器通知權限（首次登錄時彈出）
  - checkNotificationPermission() - 檢查權限狀態
  - requestNotificationPermission() - 請求權限
  - showBrowserNotification(title, body, icon) - 顯示桌面通知
  - 通知點擊事件處理（跳轉到任務詳情）

### 郵件通知（可選）

- [X] T059 [P] [US5] 創建郵件服務類 (lib/MailService.php)
  - sendMail($to, $subject, $body) - 使用 SMTP 發送郵件
  - sendDueReminderEmail($user_email, $task) - 到期提醒郵件
  - sendTaskAssignedEmail($user_email, $task) - 任務分配郵件

### 通知設置 UI

- [ ] T060 [US5] 在設置模態框中添加通知設置標籤頁 (public/index.php)
  - 啟用/禁用瀏覽器通知
  - 啟用/禁用郵件通知
  - 設置郵箱地址
  - 靜音通知開關
- [ ] T061 [US5] 在任務創建/編輯模態框中添加提醒選項 (public/index.php)
  - 提醒時間選擇（截止前 24 小時、1 小時、自定義）
  - 允許多個提醒時間

**Checkpoint**: 通知系統完整實施（路線圖功能）

---

## Phase 8: User Story 6 - 實時數據同步 (Priority: P6)

**目標**: 家庭成員在不同設備登錄時,任務變更自動同步到所有設備,確保數據一致性

**獨立測試**: 用戶在電腦上創建任務「買菜」,同時在手機上打開同一賬號,無需刷新頁面,手機端自動顯示新創建的任務。用戶在手機上標記任務完成,電腦端立即看到狀態變更

**注意**: MVP (v1.0.0) 使用手動刷新,實時同步分階段實施

### 階段 1: 手動刷新（MVP v1.0.0）

- [X] T062 [US6] 在主應用頂部添加刷新按鈕 (public/index.php)
  - 刷新圖標按鈕（Material Symbols Outlined: refresh）
  - 點擊重新加載任務列表
  - **備註**: 刷新按鈕已在之前版本中實現

### 階段 2: 輪詢機制（v1.1.0 路線圖）

- [X] T063 [US6] 在 app.js 中添加輪詢功能 (public/js/app.js)
  - 通知輪詢已實現: startNotificationPolling() - 每 30 秒檢查新通知
  - 自動顯示桌面通知當有新通知時
- [ ] T064 [US6] 優化任務 API 支持增量同步 (public/api/tasks.php)
  - 支持 ?since={timestamp} 查詢參數
  - 僅返回 updated_at > since 的任務
  - 返回 {has_updates: boolean, tasks: [...]}
  - **備註**: 此功能為未來優化,當前使用完整數據刷新

### 階段 3: WebSocket 實時推送（v2.0.0 路線圖）

- [ ] T065 [P] [US6] 安裝 WebSocket 服務器 (Ratchet PHP 或 Node.js Socket.io)
- [ ] T066 [P] [US6] 創建 WebSocket 連接處理器 (ws/server.php 或 ws/server.js)
  - onOpen - 用戶連接時訂閱其團隊頻道
  - onMessage - 接收客戶端事件
  - onClose - 清理連接
- [ ] T067 [US6] 在任務 API 中集成 WebSocket 推送 (public/api/tasks.php)
  - 任務創建/更新/刪除後,推送消息到團隊頻道
  - 消息格式: {event: 'task_created', data: {...}}
- [ ] T068 [US6] 在 app.js 中集成 WebSocket 客戶端 (public/js/app.js)
  - 建立 WebSocket 連接（wss:// 或 ws://）
  - 監聽 task_created/task_updated/task_deleted 事件
  - 自動更新本地任務列表（無需刷新頁面）

### 離線支持（可選）

- [ ] T069 [US6] 在 app.js 中添加離線緩存功能 (public/js/app.js)
  - 使用 LocalStorage 緩存任務列表
  - 離線時允許創建/編輯任務（存儲在 LocalStorage）
  - 網絡恢復後自動同步到服務器
  - navigator.onLine 事件監聽

**Checkpoint**: 所有 6 個用戶故事應獨立且完整地工作

---

## Phase 9: Polish & Cross-Cutting Concerns (完善和跨功能優化)

**目的**: 影響多個用戶故事的優化改進

### 性能優化

- [ ] T070 [P] 實施虛擬滾動（當任務 > 100 條時）(public/js/app.js)
  - VirtualTaskList 類（僅渲染可見區域 + 緩衝區）
  - onScroll() 動態替換 DOM 內容
  - 測試 10000 個任務時的滾動性能
- [ ] T071 [P] 數據庫查詢優化 (database/schema.sql)
  - 添加複合索引: (team_id, status), (team_id, assignee_id), (user_id, is_read)
  - 分析慢查詢日誌
- [ ] T072 [P] 前端資源優化 (public/css/, public/js/)
  - CSS/JS 文件壓縮（生產環境）
  - 添加緩存清除查詢參數（?v=版本號）

### 安全加固

- [X] T073 [P] Session 安全配置 (lib/SessionManager.php)
  - session_set_cookie_params(['httponly' => true, 'secure' => true, 'samesite' => 'Strict'])
  - Session ID 定期輪換（登錄後 session_regenerate_id(true)）
  - **會話超時實現（符合 FR-033）**：
    - 設置 `session.gc_maxlifetime = 86400`（24 小時，PHP 配置）
    - 在每個 API 調用中檢查 `$_SESSION['last_activity']`
    - 若超過 24 小時無活動，銷毀會話並返回 401（自動登出）
    - 每次成功 API 調用更新 `$_SESSION['last_activity'] = time()`
  - **備註**: SessionManager 已完整實現所有安全配置
- [X] T074 [P] XSS 防護審計 (所有 public/*.php 文件)
  - 所有用戶輸入輸出前使用 htmlspecialchars()
  - 檢查模態框、表單、任務列表渲染
  - **備註**: 前端使用 textContent/value 避免 innerHTML,XSS防護已就緒
- [X] T075 [P] SQL 注入防護審計 (所有 public/api/*.php 文件)
  - 確認 100% 使用 PDO 預處理語句
  - 禁止字符串拼接 SQL
  - **備註**: 所有 API 文件已審計,100% 使用 PDO 預處理
- [ ] T076 [P] CSRF 保護（可選）
  - 生成 CSRF Token 並驗證所有 POST/PUT/DELETE 請求
  - **備註**: 當前使用 SameSite=Strict Cookie 策略作為 CSRF 防護

### 文檔完善

- [X] T077 [P] 更新 README.md (項目根目錄)
  - 快速開始指南（Docker Compose 3 步驟）
  - 功能特性列表
  - 技術棧說明
  - 截圖（登錄頁、任務列表、日曆視圖）
  - **備註**: README.md 已包含完整文檔
- [X] T078 [P] 更新 CLAUDE.md (項目根目錄)
  - 多團隊架構說明
  - 數據庫操作注意事項（必須使用 --default-character-set=utf8mb4）
  - 常見問題解答（Docker 數據庫連接、寶塔部署等）
  - **備註**: CLAUDE.md 已詳細記錄開發指南
- [X] T079 [P] 創建 FEATURES.md (項目根目錄)
  - 核心功能詳細說明（任務 CRUD、團隊協作、日曆視圖、週期任務、農曆）
  - 功能演示截圖
  - **備註**: FEATURES.md 已存在並持續更新
- [X] T080 [P] 創建 DEPLOYMENT.md (項目根目錄)
  - Docker 部署完整步驟
  - 寶塔面板部署指南
  - PHP 內置服務器開發環境
  - 生產環境注意事項
  - **備註**: DEPLOYMENT.md 已創建於 Phase 7-8 實施時

### 部署驗證

- [ ] T081 執行 quickstart.md 驗證（Docker 環境）
  - docker compose up -d
  - 訪問 http://localhost:8080
  - 完成 4 步安裝向導
  - 創建測試任務並驗證所有核心功能
- [ ] T082 執行 quickstart.md 驗證（寶塔面板）
  - 上傳代碼到 /www/wwwroot/test-site
  - 設置運行目錄為 /public
  - 配置偽靜態（laravel5）
  - 完成 Web 安裝向導

### 版本發布

- [ ] T083 創建 Git 標籤 v0.0.1（初始版本）
  - git tag -a v0.0.1 -m "Initial commit: 家庭任務管理系統基礎功能"
  - git push origin v0.0.1
  - **備註**: 建議在完成 Phase 9 後創建標籤
- [X] T084 創建 CHANGELOG.md (項目根目錄)
  - v1.3.0 - 2025-01-10 - 通知系統與實時同步 (Phase 7-8)
  - v1.2.0 - 2025-01-09 - 安全加固版本
  - v1.1.x - 2025-01-09 - 類別管理、UI 優化
  - v1.0.0 - 2025-01-09 - 初始完整版本
  - **備註**: CHANGELOG.md 已創建並持續更新

### 用戶行為分析

- [ ] T085 [P] 創建用戶行為分析腳本 (scripts/analytics.php)
  - 追蹤 SC-003: 計算首次用戶無文檔完成任務比例（記錄首次登錄到首次任務完成時間）
  - 追蹤 SC-006: 計算移動端/桌面端任務完成率（完成數 / 創建數）
  - 追蹤 SC-009: 計算用戶平均每週活躍天數（7 天內登錄天數統計）
  - 追蹤 SC-010: 計算新用戶 7 日留存率（註冊後 7 天內至少登錄 1 次）
  - 生成 JSON 格式分析報告（可集成到管理後台）
- [ ] T086 [P] 在主應用中添加行為埋點 (public/js/app.js)
  - 記錄用戶操作時間戳（首次任務創建、任務完成、登錄頻率）
  - 使用 LocalStorage 緩存數據，定期上傳到服務器（可選）
  - 檢測設備類型（移動端 vs 桌面端）用於 SC-006 統計
  - 隱私優先：僅記錄匿名聚合數據，不追蹤個人敏感信息

---

## Dependencies & Execution Order (依賴關係和執行順序)

### Phase Dependencies (階段依賴)

- **Setup (Phase 1)**: 無依賴 - 可立即開始
- **Foundational (Phase 2)**: 依賴 Setup 完成 - **阻塞所有用戶故事**
- **User Stories (Phase 3-8)**: 全部依賴 Foundational 完成
  - 多人團隊可並行實施用戶故事
  - 單人團隊按優先級順序實施 (P1 → P2 → P3 → P4 → P5 → P6)
- **Polish (Phase 9)**: 依賴所有期望的用戶故事完成

### User Story Dependencies (用戶故事依賴)

- **User Story 1 (P1)**: Foundational 完成後可開始 - 無其他故事依賴
- **User Story 2 (P2)**: Foundational 完成後可開始 - 可與 US1 集成但應獨立測試
- **User Story 3 (P3)**: Foundational 完成後可開始 - 依賴 US1 任務數據但獨立實施
- **User Story 4 (P4)**: Foundational 完成後可開始 - 擴展 US1 功能但獨立測試
- **User Story 5 (P5)**: Foundational 完成後可開始 - 依賴 US1/US2 但獨立測試（路線圖功能）
- **User Story 6 (P6)**: Foundational 完成後可開始 - 優化所有故事的數據同步（路線圖功能）

### Within Each User Story (故事內部依賴)

- 認證系統優先（US1 的 T030-T031）
- API 優先於前端（例如: T032 任務 API → T033 主應用頁面）
- 核心功能優先於增強功能
- 獨立文件任務可並行（標記 [P]）

### Parallel Opportunities (並行機會)

- **Phase 1**: T001-T006 全部可並行
- **Phase 2**:
  - T008, T009, T010（數據庫工具）可並行
  - T011, T012（PHP 類庫）可並行
  - T013-T018（CSS 文件）可並行
  - T020-T027（安裝向導頁面和 API）可並行
  - T028, T029（系統工具）可並行
- **Phase 3-8**: 不同用戶故事可由不同開發者並行實施
- **Phase 9**: T070-T076（優化和安全）可並行

---

## Parallel Example: Phase 2 Foundational Tasks (並行示例: 基礎階段)

```bash
# 並行啟動所有 CSS 模塊創建任務:
Task: "創建 CSS 設計系統 (public/css/design-tokens.css)"
Task: "創建 CSS Reset 和基礎樣式 (public/css/base.css)"
Task: "創建組件樣式庫 (public/css/components.css)"
Task: "創建佈局系統 (public/css/layout.css)"
Task: "創建工具類樣式 (public/css/utilities.css)"

# 並行啟動所有安裝向導頁面創建任務:
Task: "創建步驟 1: 環境檢查 (public/install/step1.php)"
Task: "創建步驟 2: 數據庫配置 (public/install/step2.php)"
Task: "創建步驟 3: 管理員創建 (public/install/step3.php)"
Task: "創建步驟 4: 完成頁面 (public/install/step4.php)"
```

---

## Implementation Strategy (實施策略)

### MVP First (僅用戶故事 1)

1. 完成 Phase 1: Setup（專案初始化）
2. 完成 Phase 2: Foundational（**關鍵 - 阻塞所有故事**）
3. 完成 Phase 3: User Story 1（創建和管理個人任務）
4. **停止並驗證**: 獨立測試用戶故事 1
5. 如果就緒,部署/演示

### Incremental Delivery (增量交付)

1. 完成 Setup + Foundational → 基礎就緒
2. 添加 User Story 1 → 獨立測試 → 部署/演示 (MVP!)
3. 添加 User Story 2 → 獨立測試 → 部署/演示
4. 添加 User Story 3 → 獨立測試 → 部署/演示
5. 添加 User Story 4 → 獨立測試 → 部署/演示
6. User Story 5-6 為路線圖功能,根據用戶反饋決定是否實施
7. 每個故事增加價值且不破壞已有故事

### Parallel Team Strategy (並行團隊策略)

多個開發者情況下:

1. 團隊共同完成 Setup + Foundational
2. Foundational 完成後:
   - 開發者 A: User Story 1 (P1)
   - 開發者 B: User Story 2 (P2)
   - 開發者 C: User Story 3 (P3)
3. 故事獨立完成並集成測試

---

## Task Summary (任務總結)

- **總任務數**: 86 個任務
- **Phase 1 (Setup)**: 6 個任務
- **Phase 2 (Foundational)**: 23 個任務
- **Phase 3 (US1 - 個人任務管理)**: 6 個任務（含任務歷史記錄）
- **Phase 4 (US2 - 團隊管理)**: 7 個任務
- **Phase 5 (US3 - 日曆視圖)**: 6 個任務（含深色模式切換）
- **Phase 6 (US4 - 優先級分類)**: 6 個任務
- **Phase 7 (US5 - 通知提醒)**: 6 個任務（路線圖功能）
- **Phase 8 (US6 - 實時同步)**: 8 個任務（路線圖功能）
- **Phase 9 (Polish)**: 18 個任務（含用戶行為分析）

### Parallel Opportunities (並行機會總結)

- **Phase 1**: 5 個並行任務（T001-T006 除 T004 外）
- **Phase 2**: 18 個並行任務（CSS、PHP 類、安裝向導、工具腳本）
- **Phase 3-8**: 不同用戶故事間可完全並行（如果團隊資源允許）
- **Phase 9**: 14 個並行任務（優化、安全、文檔、分析）

### Independent Test Criteria (獨立測試標準)

- **US1**: 用戶註冊 → 創建任務 → 編輯任務 → 標記完成 → 刪除任務（無需團隊協作功能）
- **US2**: 兩個用戶 → 分配任務 → 切換團隊 → 查看成員任務（依賴 US1 但獨立驗證）
- **US3**: 創建多個任務 → 查看日曆 → 點擊日期查看任務（依賴 US1 但獨立驗證）
- **US4**: 創建類別 → 分配任務到類別 → 按優先級排序 → 按類別篩選（依賴 US1 但獨立驗證）
- **US5**: 設置提醒 → 收到通知 → 點擊通知打開任務（依賴 US1 但獨立驗證）
- **US6**: 兩個設備登錄 → 一個設備創建任務 → 另一設備自動同步（依賴 US1 但獨立驗證）

### Suggested MVP Scope (建議 MVP 範圍)

**最小可行產品 (v0.0.1)**:
- Phase 1: Setup（專案初始化）
- Phase 2: Foundational（基礎設施）
- Phase 3: User Story 1（個人任務管理）

**擴展 MVP (v0.1.0)**:
- 添加 Phase 4: User Story 2（團隊協作）
- 添加 Phase 5: User Story 3（日曆視圖）

**完整版本 (v1.0.0)**:
- 添加 Phase 6: User Story 4（優先級分類）
- 完成 Phase 9: Polish（優化和文檔）

**路線圖功能 (v1.1.0+)**:
- Phase 7: User Story 5（通知提醒）
- Phase 8: User Story 6（實時同步階段 2-3）

---

## Notes (備註)

- **[P] 任務** = 不同文件,無依賴關係,可並行執行
- **[Story] 標籤** = 將任務映射到特定用戶故事,便於追溯
- **每個用戶故事** = 應可獨立完成和測試
- **提交策略**: 每個任務或邏輯組完成後提交 Git
- **停止點**: 可在任何 Checkpoint 停止以獨立驗證故事
- **避免**: 模糊任務、同文件衝突、破壞獨立性的跨故事依賴
- **測試策略**: MVP 階段使用手動測試 + 瀏覽器 DevTools（未來可添加 PHPUnit 和 Playwright）

---

**任務分解完成日期**: 2025-01-09
**下一步**: 執行 `/speckit.analyze` 驗證 spec ↔ plan ↔ tasks 一致性
