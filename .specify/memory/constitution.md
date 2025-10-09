<!--
  ============================================================================
  SYNC IMPACT REPORT
  ============================================================================
  Version Change: N/A → 1.0.0

  Modified Principles:
    - Created 6 new core principles:
      I. Multi-User Collaboration First
      II. Task Management Clarity
      III. Notifications & Reminders
      IV. Responsive UI/UX Excellence
      V. Data Synchronization
      VI. Privacy & Security Standards

  Added Sections:
    - Core Principles (6 principles)
    - Security & Privacy Requirements
    - Development Standards
    - Governance

  Removed Sections:
    - None (initial creation)

  Templates Requiring Updates:
    ✅ plan-template.md - Verified alignment with multi-team architecture
    ✅ spec-template.md - Verified user story structure supports collaboration
    ✅ tasks-template.md - Verified task phases align with principles

  Follow-up TODOs:
    - None (all placeholders filled)
  ============================================================================
-->

# Family Task Manager Constitution

## Core Principles

### I. Multi-User Collaboration First

**團隊協作優先原則**

所有功能設計必須基於多團隊架構（Multi-Team Architecture）。系統採用 Slack/Feishu 風格的工作區模型，確保：

- **數據隔離**：每個團隊的任務、成員、評論嚴格隔離（team_id 強制過濾）
- **靈活切換**：用戶可同時加入多個團隊並自由切換上下文
- **權限獨立**：用戶在不同團隊中的角色（admin/member）獨立管理
- **邀請機制**：6位字符邀請碼（排除混淆字符 0,O,I,1）快速加入團隊
- **零操作成本**：所有管理功能在單一視圖完成，無需切換團隊上下文

**實施要求**：
- 所有 API 查詢必須包含 `team_id` 過濾條件
- 使用 `TeamHelper::isTeamMember()` 驗證成員資格
- 使用 `TeamHelper::isTeamAdmin()` 驗證管理員權限
- 跨團隊數據洩漏視為嚴重安全漏洞

**理由**：家庭與工作場景需要數據隔離，多工作區模型提供最佳用戶體驗。

---

### II. Task Management Clarity

**任務管理清晰原則**

任務系統必須簡單直觀，避免複雜抽象。每個任務狀態、優先級、類型必須清晰可見：

- **狀態機簡單**：pending → in_progress → completed/cancelled（4個狀態，無歧義）
- **優先級明確**：low（綠色）、medium（黃色）、high（紅色）視覺區分
- **任務類型清晰**：
  - `normal`（一般任務）：一次性任務
  - `recurring`（週期任務）：到期後自動生成下一週期
  - `repeatable`（重複任務）：手動重複執行
- **截止日期直觀**：日曆選擇器 + 農曆日期顯示，支持中國傳統節日
- **分配明確**：每個任務必須有明確的負責人（assignee_id NOT NULL）

**實施要求**：
- 任務創建默認值：assignee = 當前用戶，due_date = 今天
- 狀態變更必須記錄時間戳（created_at, updated_at）
- 週期任務配置存儲為 JSON（recurrence_config 欄位）
- 日曆視圖必須同時顯示公曆和農曆日期

**理由**：清晰的任務狀態降低認知負擔，提高家庭成員協作效率。

---

### III. Notifications & Reminders

**通知與提醒原則**

系統必須主動提醒用戶重要事項，減少遺忘風險：

- **到期提醒**：任務到期前 24 小時 / 1 小時提醒
- **分配通知**：任務被分配時通知負責人
- **狀態變更通知**：任務完成/取消時通知創建者
- **週期任務通知**：新週期任務自動生成時通知
- **團隊邀請通知**：新成員加入團隊時通知管理員

**實施要求**（路線圖）：
- 階段 1：瀏覽器推送通知（Web Push API）
- 階段 2：郵件通知（SMTP 集成）
- 階段 3：WebSocket 實時通知（可選）
- 階段 4：移動端推送通知（APP 版本）

**當前狀態**：未實現（v1.0.0）- 列入 [路線圖](../README.md#🗺️-路線圖)

**理由**：通知系統是任務管理軟件的核心功能，防止任務遺漏。

---

### IV. Responsive UI/UX Excellence

**響應式 UI/UX 卓越原則**

界面必須在所有設備上提供一致優質的體驗，遵循現代 CSS 架構：

- **Mobile-First 設計**：默認樣式為移動端，漸進增強到桌面端
- **斷點策略**：
  - Mobile（默認）：單欄任務列表，日曆隱藏
  - Tablet（≥640px）：雙欄佈局，日曆顯示
  - Desktop（≥1024px）：日曆 2/3 + 任務列表 1/3 並排
  - Large Desktop（≥1280px）：更寬鬆的間距和排版
  - 4K（≥1920px）：最大內容寬度限制，保持可讀性
- **CSS 模塊化**：
  - `design-tokens.css`：所有設計決策（顏色、字體、間距）
  - `base.css`：CSS Reset + 基礎元素
  - `components.css`：可重用組件（.btn, .badge, .card）
  - `layout.css`：佈局系統（.container, .grid, .flex）
  - `utilities.css`：工具類（.text-primary, .rounded-lg）
- **深色模式**：自動檢測系統偏好（prefers-color-scheme）+ 手動切換
- **性能優化**：CSS Cascade Layers 管理優先級，零 !important 使用
- **無障礙**：ARIA 標籤、鍵盤導航、顏色對比度符合 WCAG 2.1 AA

**實施要求**：
- 禁止內聯樣式（除動態計算值）
- 優先使用模塊化 CSS 類而非 Tailwind 工具類
- 所有交互元素必須支持鍵盤操作
- 圖標使用 SVG（不依賴 Google Fonts Icon）
- 字體使用系統字體（PingFang SC / Microsoft YaHei），避免 Google Fonts

**理由**：中國網絡環境限制，系統字體加載更快；模塊化 CSS 提升維護性。

---

### V. Data Synchronization

**數據同步原則**

多用戶環境下必須確保數據一致性，避免衝突和丟失：

- **樂觀鎖定**：更新任務時檢查 `updated_at` 時間戳，防止覆蓋他人修改
- **實時同步策略**（路線圖）：
  - 階段 1：手動刷新（當前版本 v1.0.0）
  - 階段 2：輪詢機制（每 30 秒檢查更新）
  - 階段 3：WebSocket 實時推送（最終方案）
- **衝突解決**：
  - 服務端為唯一真實來源（Server as Source of Truth）
  - 客戶端檢測到衝突時提示用戶重新加載
  - 數據庫事務保證原子性操作
- **離線支持**（未來功能）：LocalStorage 緩存 + 上線後同步

**實施要求**：
- 所有 UPDATE/DELETE 操作返回最新 `updated_at`
- 前端在提交更新時附帶舊 `updated_at` 進行比對
- 使用數據庫事務（PDO beginTransaction/commit/rollback）
- 週期任務生成使用悲觀鎖（FOR UPDATE）防止重複創建

**理由**：家庭成員同時編輯任務時，防止數據覆蓋和丟失。

---

### VI. Privacy & Security Standards

**隱私與安全標準原則**

用戶數據安全和隱私是不可妥協的底線：

- **密碼安全**：bcrypt 哈希（cost=10），禁止明文存儲
- **SQL 注入防護**：100% 使用 PDO 預處理語句（Prepared Statements）
- **XSS 防護**：所有輸出使用 `htmlspecialchars()` 轉義
- **CSRF 防護**（路線圖）：Token 驗證機制
- **會話安全**：
  - Session cookie 設置 `HttpOnly`, `Secure`, `SameSite=Strict`
  - Session ID 定期輪換（登錄後 regenerate）
  - 登出時完全銷毀會話（session_destroy）
- **權限校驗**：
  - 每個 API 調用檢查登錄狀態（`$_SESSION['user_id']`）
  - 團隊操作驗證成員資格（`TeamHelper::isTeamMember()`）
  - 管理操作驗證管理員權限（`TeamHelper::isTeamAdmin()`）
- **數據隔離**：WHERE 子句強制 `team_id` 過濾，防止橫向越權
- **文件權限**（生產環境）：
  - `config/` 目錄：755（安裝後設為只讀）
  - `public/install/` 目錄：安裝完成後必須刪除
  - 數據庫配置文件：排除 Git 提交（.gitignore）

**實施要求**：
- 禁止使用 `$_GET/$_POST` 直接拼接 SQL
- 所有錯誤信息不得洩露系統路徑或數據庫結構
- 定期安全審計（檢查 SQL 注入、XSS、權限繞過）
- 生產環境關閉 PHP 錯誤顯示（display_errors = Off）

**理由**：家庭任務可能包含敏感信息（生日、行程），必須嚴格保護。

---

## Security & Privacy Requirements

### Authentication & Authorization

- **密碼策略**：最小長度 6 字符（可配置），支持郵箱登錄
- **會話超時**：24 小時無活動自動登出（可配置）
- **權限模型**：
  - **admin**：創建團隊、修改團隊名稱、重新生成邀請碼、移除成員
  - **member**：查看團隊信息、創建/編輯/刪除自己創建的任務、修改分配給自己的任務

### Data Privacy

- **數據最小化**：僅收集必要信息（用戶名、暱稱、密碼）
- **數據保留**：用戶刪除賬號時級聯刪除所有關聯數據（ON DELETE CASCADE）
- **數據導出**（路線圖）：用戶可導出自己的所有數據（Excel/CSV）
- **日誌隱私**：日誌不記錄密碼、Session ID 等敏感信息

### Compliance

- **UTF-8 強制**：數據庫、API、前端統一使用 `utf8mb4_unicode_ci` 編碼
- **時區處理**：服務器統一使用 UTC，前端轉換為用戶本地時區（未來功能）
- **備份策略**：系統更新前自動備份配置文件（`update.sh` 腳本）

---

## Development Standards

### Code Quality

- **PHP 規範**：遵循 PSR-12 編碼規範
- **註釋語言**：所有代碼註釋必須使用繁體中文
- **命名規範**：
  - 數據庫表名：複數小寫（tasks, users, teams）
  - PHP 類名：PascalCase（Database, TeamHelper）
  - PHP 方法名：camelCase（getInstance, isTeamAdmin）
  - JavaScript 變量：camelCase（currentUser, allTasks）
  - CSS 類名：kebab-case（.task-card, .btn-primary）
- **錯誤處理**：
  - API 返回標準 HTTP 狀態碼（200, 400, 401, 403, 404, 405, 409, 500）
  - 錯誤響應格式：`{ "error": "錯誤信息" }`
  - 成功響應格式：`{ "message": "成功信息", "data": {...} }`

### Database Standards

- **遷移系統**：所有表結構變更通過遷移文件管理（`database/migrations/`）
- **遷移命名**：`YYYYMMDDHHMMSS_description.sql`（例：`20250103120000_add_user_avatar.sql`）
- **字符集強制**：
  - 數據庫：`CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  - 表：創建時顯式指定字符集
  - 連接：PDO 連接字符串包含 `charset=utf8mb4`
  - MySQL CLI：始終使用 `--default-character-set=utf8mb4`
- **索引策略**：
  - 主鍵：`id BIGINT UNSIGNED AUTO_INCREMENT`
  - 外鍵：`team_id`, `user_id`, `assignee_id` 添加索引
  - 查詢頻繁字段：`status`, `due_date`, `created_at` 添加複合索引
- **時間戳**：所有表包含 `created_at` 和 `updated_at`（TIMESTAMP DEFAULT CURRENT_TIMESTAMP）

### Frontend Standards

- **零依賴原則**：前端使用原生 JavaScript，無需 npm/webpack/構建工具
- **API 調用**：統一使用 `fetch()` API，避免 XMLHttpRequest
- **全局狀態**：使用簡單對象管理（`currentUser`, `allTasks`, `currentTeam`）
- **事件處理**：使用事件委託減少監聽器數量
- **性能優化**：
  - 任務列表虛擬滾動（超過 100 條時）
  - 防抖（debounce）處理搜索輸入
  - 日曆視圖僅渲染當前月份 ±1 月

### Deployment Standards

- **環境支持**：
  - 開發環境：Docker Compose（推薦）
  - 生產環境：寶塔面板 / aaPanel（推薦）
  - 測試環境：PHP 內置服務器（僅開發用）
- **安裝向導**：WordPress 風格 4 步安裝（環境檢查 → 數據庫配置 → 管理員創建 → 完成）
- **更新機制**：
  - Web 界面：設置 → 系統更新 → 檢查更新 → 立即更新
  - 命令行：`bash update.sh`（自動 Git pull + 遷移 + 權限設置）
- **版本管理**：
  - 語義化版本（Semantic Versioning）：MAJOR.MINOR.PATCH
  - 初始版本：v0.0.1
  - 小更新：PATCH +1（修復 bug）
  - 中更新：MINOR +1（新功能）
  - 大更新：MAJOR +1（破壞性變更）
- **Git 工作流**：
  - 主分支：`main`（生產環境）
  - 功能分支：`feature/功能名稱`
  - 修復分支：`fix/問題描述`
  - 提交信息：遵循 Conventional Commits（feat, fix, docs, style, refactor, test, chore）

---

## Governance

### Amendment Procedure

本憲法是本項目的最高技術指導文件，所有代碼、API、UI 設計必須符合憲法原則。

**修訂流程**：
1. **提案**：通過 GitHub Issue 提出修訂建議，說明原因和影響範圍
2. **討論**：項目維護者和社區成員討論可行性
3. **投票**：項目維護者投票通過（需 2/3 多數）
4. **實施**：更新憲法文件，同步更新相關模板和文檔
5. **遷移計劃**：若修訂影響現有代碼，需提供遷移路徑和時間表

### Versioning Policy

- **MAJOR 版本**：移除核心原則、重新定義架構（例：移除多團隊支持）
- **MINOR 版本**：新增原則、擴展現有原則（例：新增「國際化原則」）
- **PATCH 版本**：澄清措辭、修正錯別字、補充實施細節

### Compliance Review

- **代碼審查**：所有 Pull Request 必須引用相關憲法原則，說明符合性
- **定期審計**：每季度審查代碼庫是否違反憲法原則（特別是安全和隱私）
- **複雜性審查**：引入新技術棧或架構必須說明理由，通過「複雜性追蹤」表格記錄

### Runtime Guidance

本憲法為高層次指導原則，具體開發指南請參考：
- **項目技術文檔**：[CLAUDE.md](../../CLAUDE.md)（API 文檔、數據庫架構、部署指南）
- **數據庫遷移文檔**：[database/migrations/README.md](../../database/migrations/README.md)
- **週期任務文檔**：[RECURRING_TASKS.md](../../RECURRING_TASKS.md)
- **農曆日曆文檔**：[LUNAR_CALENDAR.md](../../LUNAR_CALENDAR.md)
- **寶塔部署指南**：[BAOTA_GUIDE.md](../../BAOTA_GUIDE.md)
- **Docker 部署指南**：[DOCKER_GUIDE.md](../../DOCKER_GUIDE.md)

---

**Version**: 1.0.0 | **Ratified**: 2025-01-09 | **Last Amended**: 2025-01-09
