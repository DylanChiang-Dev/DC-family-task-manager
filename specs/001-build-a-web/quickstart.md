# Quick Start: 家庭協作任務管理系統

**Feature**: 001-build-a-web
**Date**: 2025-01-09
**Target**: 快速啟動本地開發環境

---

## 方式一：Docker Compose（推薦）

### 前置要求
- Docker 20.10+
- Docker Compose 2.0+

### 步驟

#### 1. 克隆倉庫
```bash
git clone https://github.com/DylanChiang-Dev/family-task-manager.git
cd family-task-manager
```

#### 2. 啟動服務
```bash
docker-compose up -d
```

#### 3. 訪問應用
- **主應用**: http://localhost:8080
- **phpMyAdmin**: http://localhost:8081

#### 4. 完成安裝向導
1. 訪問 http://localhost:8080
2. 自動跳轉到安裝向導（`/install/index.php`）
3. 填寫數據庫配置：
   - 主機：`db`（**重要**：不是 localhost）
   - 端口：`3306`
   - 數據庫：`family_tasks`
   - 用戶名：`family_user`
   - 密碼：`family_pass`
4. 創建管理員賬號
5. 開始使用！

---

## 方式二：寶塔面板（生產環境）

### 前置要求
- 寶塔面板 7.x / aaPanel
- PHP 7.4+ / 8.1
- MySQL 5.7+ / 8.0
- Nginx

### 步驟

#### 1. 安裝寶塔面板
```bash
# CentOS 安裝
wget -O install.sh https://download.bt.cn/install/install_6.0.sh && sh install.sh ed8484bec

# Ubuntu 安裝
wget -O install.sh https://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh ed8484bec
```

#### 2. 添加站點
1. 登錄寶塔面板：`http://你的服務器IP:8888`
2. 左側「網站」→「添加站點」
3. 填寫配置：
   - 域名：`your-domain.com` 或 IP
   - 根目錄：`/www/wwwroot/family-task-manager`
   - PHP 版本：7.4 或 8.1
   - 數據庫：創建 MySQL 數據庫

#### 3. 部署代碼
```bash
cd /www/wwwroot
git clone https://github.com/DylanChiang-Dev/family-task-manager.git
cd family-task-manager
```

#### 4. 配置站點
1. 設置運行目錄：網站設置 → 網站目錄 → 運行目錄選擇 `/public`
2. 設置偽靜態：網站設置 → 偽靜態 → 選擇 `laravel5`
3. 設置權限：
```bash
chmod -R 777 config/
chown -R www:www /www/wwwroot/family-task-manager
```

#### 5. 完成安裝
訪問您的域名，按照 Web 安裝向導操作。

---

## 方式三：PHP 內置服務器（僅開發用）

### 前置要求
- PHP 7.4+ CLI
- MySQL 5.7+ / 8.0

### 步驟
```bash
# 1. 創建數據庫
mysql -u root -p -e "CREATE DATABASE family_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. 啟動開發服務器
cd public
php -S localhost:8000

# 3. 訪問
open http://localhost:8000
```

---

## 常見問題

### Q: Docker 環境數據庫連接失敗
**A**: 確保數據庫主機填寫 `db`（Docker 服務名），不是 `localhost`

### Q: 寶塔面板訪問顯示 404
**A**: 檢查運行目錄是否設置為 `/public`

### Q: 中文字符顯示亂碼
**A**: 確保數據庫使用 `utf8mb4_unicode_ci` 字符集：
```sql
ALTER DATABASE family_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Q: config 目錄無寫權限
**A**:
```bash
chmod -R 777 config/
```

---

## 下一步

- 📖 閱讀 [CLAUDE.md](../../CLAUDE.md) 了解項目架構
- 🗂️ 查看 [data-model.md](data-model.md) 理解數據庫設計
- 🔌 參考 [contracts/](contracts/) 了解 API 端點

---

**完成日期**: 2025-01-09
