# Implementation Plan: 家庭協作任務管理系統

**Branch**: `001-build-a-web` | **Date**: 2025-01-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-build-a-web/spec.md`

## Summary

構建一個支持多團隊協作的家庭任務管理 Web 應用，核心功能包括任務 CRUD、團隊成員管理、日曆視圖、優先級分類、通知提醒和實時數據同步。採用 PHP + MySQL + 原生 JavaScript 技術棧，遵循 Slack/Feishu 風格的多工作區架構，確保數據隔離和安全性。系統支持響應式設計、深色模式、農曆日曆，並內置 WordPress 風格的 Web 安裝向導。

**技術方案**：單體 Web 應用（非前後端分離），使用 PHP 7.4/8.1 + PDO 處理 RESTful API，原生 JavaScript 實現前端交互，MySQL 8.0 存儲數據，Docker Compose 支持本地開發，寶塔面板支持生產部署。

---

## Technical Context

**Language/Version**: PHP 7.4+ / 8.1（推薦 8.1，兼容寶塔面板 5.7.44 MySQL 版本）
**Primary Dependencies**:
- 後端：PDO (MySQL)、bcrypt (密碼哈希)
- 前端：原生 JavaScript (ES6+)、Fetch API
- CSS：模塊化 CSS（design-tokens.css, components.css, layout.css）

**Storage**: MySQL 8.0（兼容 5.7.8+）
- 字符集：utf8mb4_unicode_ci（強制，支持中文和 Emoji）
- 引擎：InnoDB（支持事務和外鍵）
- 連接池：PDO Singleton 模式

**Testing**:
- 階段 1（MVP）：手動測試 + 瀏覽器 DevTools
- 階段 2（未來）：PHPUnit（單元測試）、Playwright（E2E 測試）

**Target Platform**:
- 開發環境：Docker Compose (Nginx + PHP-FPM + MySQL + phpMyAdmin)
- 生產環境：寶塔面板 / aaPanel (Nginx + PHP 7.4/8.1 + MySQL 5.7/8.0)
- 瀏覽器：Chrome/Firefox/Safari/Edge 最新版本（支持 ES6+、CSS Grid、Fetch API）

**Project Type**: Web application (單體架構，非前後端分離)

**Performance Goals**:
- 任務列表加載時間：< 3 秒（含網絡延遲）
- 並發用戶：≥ 1000 concurrent users
- 數據庫查詢響應：< 200ms (P95)
- 前端渲染：< 1 秒（10000 個任務時使用虛擬滾動）
- 實時同步延遲：< 3 秒（階段 2: 輪詢，階段 3: WebSocket）

**Constraints**:
- 零前端構建工具（無 npm/webpack，純 CDN 或本地 JS/CSS）
- 無 Google 服務依賴（字體、圖標、API），適應中國網絡環境
- 所有註釋使用繁體中文
- 禁止 Git 提交時顯示 Claude 聯合作者信息
- 響應式設計必須支持移動端（<640px）、平板（≥640px）、桌面（≥1024px）

**Scale/Scope**:
- 團隊規模：3-20 名成員/團隊
- 任務數量：100-500 個任務/團隊（設計支持最多 10000 個）
- 用戶規模：初期 100 用戶，擴展支持 10000 用戶
- 數據保留：已完成任務永久保存（未來可添加歸檔功能）

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Multi-User Collaboration First ✅

- ✅ **數據隔離**：所有 API 查詢包含 `team_id` WHERE 過濾條件
- ✅ **權限驗證**：使用 `TeamHelper::isTeamMember()` 和 `TeamHelper::isTeamAdmin()`
- ✅ **邀請機制**：6 位邀請碼（排除 0,O,I,1），存儲在 `teams.invite_code`
- ✅ **多團隊切換**：`users.current_team_id` 存儲當前活動團隊

### II. Task Management Clarity ✅

- ✅ **狀態機簡單**：4 個狀態（pending, in_progress, completed, cancelled）
- ✅ **優先級視覺化**：CSS 類（.priority-low/.priority-medium/.priority-high）對應顏色
- ✅ **任務類型**：normal/recurring/repeatable（存儲在 `tasks.task_type`）
- ✅ **農曆日期**：`lunar.js` 純 JavaScript 實現（1900-2100）
- ✅ **默認值**：assignee = 當前用戶，due_date = 今天

### III. Notifications & Reminders ⚠️

- ⚠️ **當前狀態**：未實現（v1.0.0 範圍外，列入路線圖）
- 📋 **路線圖**：
  - 階段 1：瀏覽器推送通知（Web Push API）
  - 階段 2：郵件通知（SMTP 集成）
  - 階段 3：WebSocket 實時通知
  - 階段 4：移動端推送（APP 版本）

### IV. Responsive UI/UX Excellence ✅

- ✅ **Mobile-First**：默認樣式為移動端，使用 `@media (min-width: ...)` 漸進增強
- ✅ **斷點策略**：640px (tablet) / 1024px (desktop) / 1280px (large) / 1920px (4K)
- ✅ **CSS 模塊化**：design-tokens.css, base.css, components.css, layout.css, utilities.css
- ✅ **深色模式**：`prefers-color-scheme` 自動檢測 + `.dark` 類手動切換
- ✅ **無 Google 依賴**：系統字體（PingFang SC / Microsoft YaHei）、SVG 圖標

### V. Data Synchronization ✅

- ✅ **樂觀鎖定**：`updated_at` 時間戳比對（前端附帶舊值，後端驗證）
- ✅ **階段 1（MVP）**：手動刷新（用戶點擊刷新按鈕）
- 📋 **階段 2（路線圖）**：輪詢機制（每 30 秒檢查更新）
- 📋 **階段 3（路線圖）**：WebSocket 實時推送
- ✅ **數據庫事務**：PDO `beginTransaction/commit/rollback`

### VI. Privacy & Security Standards ✅

- ✅ **密碼安全**：bcrypt (cost=10)
- ✅ **SQL 注入防護**：100% PDO 預處理語句
- ✅ **XSS 防護**：`htmlspecialchars()` 輸出轉義
- ✅ **Session 安全**：HttpOnly, Secure, SameSite=Strict
- ✅ **權限校驗**：每個 API 調用檢查 `$_SESSION['user_id']` 和團隊成員資格
- ✅ **數據隔離**：WHERE 子句強制 `team_id` 過濾

**憲法合規性總結**: ✅ 6/6 原則通過（通知系統在路線圖中，不影響 MVP 合規性）

---

## Project Structure

### Documentation (this feature)

```
specs/001-build-a-web/
├── spec.md              # 功能規格說明書（已完成）
├── plan.md              # 本文件（技術實施計劃）
├── research.md          # Phase 0 技術調研（樂觀鎖定、實時同步、農曆算法）
├── data-model.md        # Phase 1 數據模型設計（7 個實體 ER 圖）
├── quickstart.md        # Phase 1 快速啟動指南（Docker/寶塔部署）
├── contracts/           # Phase 1 API 合約（OpenAPI 規範）
│   ├── auth.yaml        # 認證 API（註冊/登錄/登出）
│   ├── teams.yaml       # 團隊 API（創建/加入/切換/管理）
│   ├── tasks.yaml       # 任務 API（CRUD + 篩選 + 排序）
│   ├── users.yaml       # 用戶 API（列表/個人資料）
│   └── categories.yaml  # 類別 API（管理員 CRUD）
└── tasks.md             # Phase 2 任務分解（由 /speckit.tasks 生成）
```

### Source Code (repository root)

本項目為**單體 Web 應用**，採用 PHP 後端 + 原生 JavaScript 前端的傳統架構（非前後端分離）。項目結構遵循現有代碼庫佈局：

```
/Users/zhangkaishen/Documents/home-list-next/
├── config/                       # 配置文件（不提交 Git）
│   ├── database.php              # 數據庫連接配置
│   ├── config.php                # 應用配置（應用名稱、版本等）
│   └── installed.lock            # 安裝鎖定文件
│
├── database/                     # 數據庫相關文件
│   ├── schema.sql                # 完整表結構定義
│   ├── seed_demo_tasks.sql      # 示例數據（16 個任務）
│   └── migrations/               # 數據庫遷移
│       ├── README.md             # 遷移系統文檔
│       └── *.sql                 # 遷移文件（格式：YYYYMMDDHHMMSS_description.sql）
│
├── lib/                          # PHP 輔助類庫
│   ├── Database.php              # 數據庫單例類（PDO 連接池）
│   └── TeamHelper.php            # 團隊輔助函數（isTeamMember, isTeamAdmin, generateInviteCode）
│
├── public/                       # Web 根目錄（Nginx/Apache DocumentRoot）
│   ├── index.php                 # 主應用入口（登錄後）
│   ├── login.php                 # 登錄頁面
│   │
│   ├── api/                      # RESTful API 端點
│   │   ├── auth.php              # 認證 API（POST login/logout/register, GET check）
│   │   ├── teams.php             # 團隊 API（GET list, POST create/join/switch, PUT update, DELETE remove）
│   │   ├── tasks.php             # 任務 API（GET list, POST create, PUT update, DELETE delete）
│   │   ├── users.php             # 用戶 API（GET list - 團隊成員）
│   │   ├── profile.php           # 用戶資料 API（POST update - 暱稱、密碼）
│   │   └── update.php            # 系統更新 API（GET version/check, POST update）
│   │
│   ├── install/                  # WordPress 風格安裝向導（安裝後刪除）
│   │   ├── index.php             # 安裝向導入口
│   │   ├── step1.php             # 步驟 1：環境檢查
│   │   ├── step2.php             # 步驟 2：數據庫配置
│   │   ├── step3.php             # 步驟 3：管理員創建
│   │   ├── step4.php             # 步驟 4：完成
│   │   ├── check.php             # API：環境檢查
│   │   ├── test_db.php           # API：數據庫連接測試
│   │   ├── save_db.php           # API：保存數據庫配置
│   │   └── install.php           # API：執行安裝（創建表、插入數據）
│   │
│   ├── css/                      # 樣式表（模塊化 CSS）
│   │   ├── design-tokens.css     # CSS 變量（顏色、字體、間距、陰影）
│   │   ├── base.css              # CSS Reset + 基礎元素樣式
│   │   ├── components.css        # 可重用組件（.btn, .badge, .task-card, .modal）
│   │   ├── layout.css            # 佈局系統（.container, .grid, .flex）
│   │   ├── utilities.css         # 工具類（.text-primary, .rounded-lg）
│   │   └── style.css             # 主入口（CSS Cascade Layers 導入順序）
│   │
│   └── js/                       # JavaScript 文件（原生 ES6+）
│       ├── app.js                # 主應用邏輯（任務 CRUD、團隊切換、日曆渲染）
│       └── lunar.js              # 農曆轉換庫（純 JS 實現，1900-2100）
│
├── scripts/                      # 系統腳本
│   ├── migrate.php               # 遷移執行腳本（--status, --rollback）
│   └── make-migration.php        # 遷移生成工具
│
├── docker/                       # Docker 配置
│   ├── nginx/
│   │   └── default.conf          # Nginx 虛擬主機配置
│   └── php/
│       └── php.ini               # PHP 配置（max_upload_size, memory_limit）
│
├── docker-compose.yml            # Docker Compose 服務定義（web, nginx, db, phpmyadmin）
├── Dockerfile                    # PHP-FPM 鏡像定義（PHP 7.4 + PDO 擴展）
├── update.sh                     # 系統更新腳本（Git pull + 遷移 + 權限設置）
├── .gitignore                    # Git 忽略規則（config/, node_modules/）
├── CLAUDE.md                     # 項目技術文檔（開發指南）
└── README.md                     # 項目介紹（快速開始）
```

**結構決策說明**:

1. **單體架構**：PHP 同時處理頁面渲染和 API 請求，無需前後端分離的複雜性
2. **Public 目錄**：所有 Web 可訪問文件放在 `public/`，其他目錄（`lib/`, `config/`）不可直接訪問
3. **API 目錄**：RESTful 端點集中在 `public/api/`，便於統一鑑權和錯誤處理
4. **模塊化 CSS**：遵循憲法第 IV 條原則，使用 CSS Cascade Layers 管理優先級
5. **零構建工具**：所有 JS/CSS 直接加載，無需 npm/webpack，降低部署複雜度

---

## Complexity Tracking

本項目設計符合憲法所有原則，無需複雜性豁免。以下決策遵循 KISS 原則：

| 潛在複雜點 | 簡化方案 | 理由 |
|-----------|----------|------|
| 前後端分離 | **拒絕** - 採用單體 PHP 應用 | 團隊規模小，無需微服務複雜性 |
| 構建工具 | **拒絕** - 使用原生 JS/CSS | 降低部署和維護成本，符合憲法 |
| ORM 框架 | **拒絕** - 直接使用 PDO | 數據庫查詢簡單，ORM 增加學習成本 |
| 狀態管理庫 | **拒絕** - 使用全局對象（`currentUser`, `allTasks`） | 應用狀態簡單，無需 Redux/Vuex |
| WebSocket（實時同步）| **分階段實施** - MVP 使用手動刷新，階段 2 輪詢，階段 3 WebSocket | 降低 MVP 技術風險，漸進增強 |
| 農曆庫依賴 | **自研** - 純 JS 實現（`lunar.js`） | 避免外部依賴，符合零構建工具原則 |

---

## Phase 0: 技術調研 (Research)

詳見 [research.md](research.md)（由本計劃生成）

**調研主題**:
1. **樂觀鎖定實現** - 如何使用 `updated_at` 時間戳防止並發覆蓋
2. **實時同步策略** - 輪詢 vs WebSocket 性能對比和實施方案
3. **農曆算法** - 1900-2100 年農曆日期轉換的純 JS 實現
4. **虛擬滾動** - 處理 10000 個任務時的前端性能優化
5. **PDO 連接池** - Singleton 模式在高並發下的性能表現
6. **bcrypt 性能** - cost=10 在用戶註冊/登錄時的響應時間影響

---

## Phase 1: 數據模型與 API 合約

詳見以下文檔（由本計劃生成）:
- [data-model.md](data-model.md) - 完整 ER 圖和表結構
- [contracts/](contracts/) - OpenAPI 3.0 規範的 API 合約
- [quickstart.md](quickstart.md) - Docker 和寶塔部署快速啟動指南

**關鍵實體**（7 個核心表）:
1. `users` - 用戶表（郵箱、密碼、暱稱、當前團隊）
2. `teams` - 團隊表（名稱、6 位邀請碼、創建者）
3. `team_members` - 團隊成員關聯表（多對多，包含角色：admin/member）
4. `tasks` - 任務表（標題、描述、狀態、優先級、截止日期、類別、團隊）
5. `categories` - 類別表（名稱、顏色、團隊、創建者必須是管理員）
6. `notifications` - 通知表（類型、內容、是否已讀、關聯任務）
7. `task_history` - 任務歷史表（審計日誌，記錄所有變更）

**API 端點**（5 個核心資源）:
1. **認證 API** (`/api/auth.php`) - POST login/logout/register, GET check
2. **團隊 API** (`/api/teams.php`) - GET list/details/members, POST create/join/switch, PUT update, DELETE remove_member
3. **任務 API** (`/api/tasks.php`) - GET list (支持篩選 + 排序), POST create, PUT update, DELETE delete
4. **用戶 API** (`/api/users.php`) - GET list (僅返回當前團隊成員)
5. **類別 API** (`/api/categories.php`) - GET list, POST create (僅管理員), PUT update (僅管理員), DELETE delete (僅管理員)

---

## Phase 2: 任務分解

**注意**: 本階段由 `/speckit.tasks` 命令執行，不在 `/speckit.plan` 範圍內。

執行以下命令生成任務列表：

```bash
/speckit.tasks
```

預期輸出: [tasks.md](tasks.md)

---

## 下一步行動

1. ✅ **Phase 0**: 生成 `research.md`（技術調研文檔）
2. ✅ **Phase 1**: 生成 `data-model.md`（數據模型設計）
3. ✅ **Phase 1**: 生成 `contracts/`（API 合約）
4. ✅ **Phase 1**: 生成 `quickstart.md`（快速啟動指南）
5. ⏭️ **Phase 2**: 執行 `/speckit.tasks` 生成任務分解
6. ⏭️ **Phase 3**: 執行 `/speckit.analyze` 驗證一致性
7. ⏭️ **Phase 4**: 執行 `/speckit.implement` 開始實施

---

**計劃完成時間**: 2025-01-09
**下一個命令**: 等待 Phase 0-1 文檔生成完成後，執行 `/speckit.tasks`
