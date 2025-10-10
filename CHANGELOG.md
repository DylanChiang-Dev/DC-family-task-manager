# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.3.0] - 2025-01-10

### 🔔 Notifications & Real-time Sync (通知系統與實時同步)

**Phase 7: 任務通知與提醒系統**

- **通知 API** (`public/api/notifications.php`)
  - GET: 獲取用戶通知列表 (支持未讀篩選)
  - POST mark_read: 標記單個通知已讀
  - POST mark_all_read: 批量標記所有通知已讀
  - DELETE: 刪除通知
  - 包含未讀數量統計

- **通知生成服務** (`lib/NotificationService.php`)
  - 任務分配通知 (sendTaskAssigned)
  - 狀態變更通知 (sendStatusChanged)
  - 任務刪除通知 (sendTaskDeleted)
  - 到期提醒通知 (sendDueReminder)
  - Cron 任務支持 (checkAndSendDueReminders)

- **瀏覽器推送通知** (Web Push API)
  - 檢查/請求通知權限
  - 顯示桌面通知 (10秒自動關閉)
  - 點擊通知跳轉任務詳情
  - 每30秒自動輪詢新通知
  - 自動更新未讀數量標記

- **郵件服務框架** (`lib/MailService.php`)
  - SMTP 郵件發送基礎
  - 到期提醒郵件模板
  - 任務分配郵件模板
  - 需配置 SMTP 後啟用

**Phase 8: 實時數據同步**

- 手動刷新按鈕 (頂部導航欄)
- 通知輪詢機制 (每30秒自動檢查)
- 自動推送桌面通知

### 🗄️ Database (數據庫)

- **新增遷移**: `20250110140000_add_created_by_to_notifications.sql`
  - 為 notifications 表添加 created_by 欄位
  - 追蹤通知觸發者

### 🔗 Integration (集成)

- **任務 API 集成通知**
  - 創建任務時: 通知被分配成員
  - 更新任務時: 通知狀態變更/分配變更
  - 刪除任務時: 通知相關成員
  - 智能去重 (不通知自己)

### 📦 Files Changed

- **新增**: `public/api/notifications.php` - 通知 API
- **新增**: `lib/NotificationService.php` - 通知服務
- **新增**: `lib/MailService.php` - 郵件服務
- **新增**: `database/migrations/20250110140000_add_created_by_to_notifications.sql`
- **修改**: `public/api/tasks.php` - 集成通知觸發
- **修改**: `public/js/app.js` - 前端通知功能 (~260行新增)

---

## [v1.2.0] - 2025-01-09

### 🔐 Security (安全加固)

- **Session 管理重構**
  - 創建 `SessionManager` 類統一管理會話
  - HttpOnly + Secure + SameSite=Strict Cookie 配置
  - 24小時無活動自動登出機制
  - 登錄時 Session ID 自動輪換防固定攻擊

- **安全審計完成**
  - XSS 防護：前端使用 textContent/value 避免 innerHTML
  - SQL 注入防護：100% PDO 預處理語句
  - CSRF 防護：SameSite Cookie 策略

### 📚 Documentation (文檔)

- 更新 README.md 安全特性說明
- 新增 CHANGELOG.md 版本記錄

### 📦 Files Changed

- **新增**: `lib/SessionManager.php` - 統一 Session 管理類
- **新增**: `CHANGELOG.md` - 版本變更記錄
- **修改**: 所有 API 文件統一使用 SessionManager

---

## [v1.1.1] - 2025-01-09

### ✨ UI 優化

- 暗色模式切換優化
- 今日任務顯示優化

---

## [v1.1.0] - 2025-01-09

### ✨ Features

- 添加任務類別管理功能
- 類別選擇器集成

---

## [v1.0.0] - 2025-01-09

### 🎉 初始發布

完整的多團隊任務管理系統，支持家庭和工作場景的任務協作。

### ✨ Added (新功能)

#### 核心功能
- **多團隊架構（Slack/Feishu 模式）**
  - 用戶可加入多個團隊並自由切換
  - 6位邀請碼快速加入團隊
  - 數據嚴格隔離，確保團隊隱私
  - 角色管理（admin/member）

- **任務管理系統**
  - 完整 CRUD 功能（創建/讀取/更新/刪除）
  - 三檔優先級（低/中/高）
  - 四種狀態（待處理/進行中/已完成/已取消）
  - 任務分配給團隊成員
  - 截止日期設置
  - 任務歷史記錄（審計日誌）

- **任務分類系統**
  - 自定義類別（如家務、購物、財務）
  - 顏色標記
  - 按類別篩選任務
  - 管理員權限控制

- **日曆視圖**
  - 月曆網格展示任務
  - 農曆日期顯示（1900-2100年）
  - 任務截止日期可視化
  - 點擊日期查看當天任務

- **響應式設計**
  - 移動端（<1024px）：純列表視圖
  - 桌面端（≥1024px）：日曆+列表並排
  - 深色模式支持（自動檢測+手動切換）

#### 系統特性
- **WordPress 風格安裝向導**
  - 4步可視化安裝流程
  - 環境自動檢測
  - 數據庫連接測試
  - 一鍵創建管理員

- **數據庫遷移系統**
  - 自動管理表結構變更
  - 版本追蹤
  - 支持回滾（可選）

- **一鍵更新**
  - Web界面檢查更新
  - 自動拉取代碼
  - 自動執行遷移
  - 配置文件備份

### 🔐 Security (安全)

- **Session 安全加固**
  - HttpOnly + Secure + SameSite=Strict Cookie
  - 24小時無活動自動登出
  - Session ID 輪換防止固定攻擊

- **密碼安全**
  - bcrypt 哈希（cost=10）

- **SQL 注入防護**
  - 100% 使用 PDO 預處理語句

- **XSS 防護**
  - 所有輸出自動轉義

- **CSRF 防護**
  - SameSite Cookie 策略

### 📦 Tech Stack (技術棧)

- **後端**: PHP 7.4+/8.1+
- **數據庫**: MySQL 5.7.8+/8.0+
- **前端**: Vanilla JavaScript (零依賴)
- **CSS**: Tailwind CSS 3.x (CDN)
- **容器化**: Docker + Docker Compose

### 🐛 Fixed (修復)

- 修復任務截止日期選擇器無法點擊的問題
- 修復中文字符在 MySQL 中的編碼問題（強制 utf8mb4）
- 修復團隊切換後數據未刷新的問題

### 📚 Documentation (文檔)

- 完整的 README.md（含 Docker 和寶塔部署指南）
- CLAUDE.md 技術文檔
- 數據庫遷移文檔（database/migrations/README.md）
- 週期任務文檔（RECURRING_TASKS.md）
- 農曆日曆文檔（LUNAR_CALENDAR.md）

### 🏗️ Infrastructure (基礎設施)

- Docker Compose 配置（PHP-FPM + Nginx + MySQL + phpMyAdmin）
- 寶塔面板/aaPanel 部署支持
- 自動更新腳本（update.sh）
- 數據庫遷移系統

---

## 🗺️ Roadmap (路線圖)

### [v1.3.0] - 計劃中

- [ ] 任務通知系統（瀏覽器推送）
- [ ] 郵件提醒
- [ ] 輪詢機制（30秒自動同步）
- [ ] 任務評論功能
- [ ] 文件附件上傳

### [v2.0.0] - 長期計劃

- [ ] WebSocket 實時推送（3秒內同步）
- [ ] 離線支持（LocalStorage 緩存）
- [ ] 移動端 APP
- [ ] 數據導出（Excel/CSV）
- [ ] 任務模板
- [ ] 甘特圖視圖

---

## 版本說明

### 版本號規則

本項目遵循語義化版本 (Semantic Versioning)：

- **主版本號 (Major)**: 不兼容的 API 修改
- **次版本號 (Minor)**: 新功能添加，向下兼容
- **修訂號 (Patch)**: Bug 修復，向下兼容

### 當前版本

**v1.2.0** - 安全加固版本，Session 管理重構 + 完整安全審計

---

## 貢獻

查看 [README.md](README.md#-貢獻) 了解如何貢獻代碼。

---

## License

本項目採用 [MIT License](LICENSE) 開源協議。
