# 家庭任務管理系統 | Family Task Manager

<div align="center">

![PHP Version](https://img.shields.io/badge/PHP-8.1+-blue)
![MySQL Version](https://img.shields.io/badge/MySQL-8.0+-orange)
![License](https://img.shields.io/badge/license-MIT-green)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)

一款現代化的自托管多團隊任務管理系統，支持家庭和工作場景。採用 Slack/Feishu 風格的多工作區架構，內置農曆日期、週期任務、自動更新等功能。

[功能特性](#-功能特性) • [快速開始](#-快速開始) • [文檔](#-文檔) • [貢獻](#-貢獻)

</div>

---

## ✨ 功能特性

### 🏢 多團隊架構（Slack/Feishu 模式）
- **多工作區支持**：用戶可加入多個團隊（如「家庭團隊」「工作團隊」）並自由切換
- **數據隔離**：每個團隊的任務、成員完全獨立
- **邀請碼系統**：6位邀請碼快速加入團隊
- **角色管理**：團隊管理員和普通成員，權限獨立管理
- **靈活切換**：頂部下拉菜單一鍵切換團隊上下文

### 📅 任務管理
- **完整 CRUD**：創建、讀取、更新、刪除任務
- **優先級**：低/中/高三檔優先級
- **狀態跟蹤**：待處理/進行中/已完成/已取消
- **任務分配**：指派給團隊成員
- **截止日期**：日曆選擇器設置到期時間
- **實時過濾**：按狀態快速篩選任務
- **日曆視圖**：直觀的月曆展示任務

### 🔄 週期任務
- **任務類型**：一般任務、週期任務、重複任務
- **週期頻率**：每日、每週、每月、每年
- **靈活配置**：
  - 每週任務：選擇星期幾（如每週一/三/五）
  - 每月任務：選擇日期（如每月1號和15號）
  - 每年任務：選擇月份和日期（如每年生日）
- **自動生成**：到期後自動創建下一週期任務

### 🌙 農曆日期
- **本地農曆轉換**：純 JavaScript 實現，1900-2100 年範圍
- **日曆顯示**：日曆中同時顯示公曆和農曆日期
- **節日提醒**：支持農曆節日（春節、端午、中秋等）
- **閏月支持**：完整支持農曆閏月計算

### 🎨 現代化界面
- **響應式設計**：完美適配手機、平板、桌面
- **深色模式**：支持亮色/深色主題自動切換
- **Material Design**：Material Symbols Outlined 圖標
- **Tailwind CSS**：現代化 UI 框架
- **零依賴前端**：原生 JavaScript，無需構建工具

### 🔐 安全特性
- **密碼安全**：bcrypt 哈希（cost=10）
- **SQL 注入防護**：全面使用 PDO 預處理語句
- **會話管理**：安全的 Session 處理
- **輸入驗證**：服務端和客戶端雙重驗證
- **XSS 防護**：模板輸出轉義

### 🚀 系統特性
- **WordPress 風格安裝**：4步可視化安裝向導
- **一鍵更新**：Web界面檢查和執行系統更新
- **數據庫遷移**：自動管理表結構變更
- **Docker 支持**：開箱即用的 Docker Compose 配置
- **郵箱登錄**：支持主流郵箱快速註冊

---

## 🛠️ 技術棧

| 類別 | 技術 |
|------|------|
| **後端** | PHP 7.4+, PDO |
| **數據庫** | MySQL 5.7.8+ / 8.0+ |
| **前端** | Vanilla JavaScript (零依賴) |
| **CSS** | Tailwind CSS 3.x (CDN) |
| **字體** | 系統字體（PingFang SC / Microsoft YaHei） |
| **圖標** | SVG 圖標 |
| **架構** | RESTful API |
| **容器化** | Docker + Docker Compose |

---

## 📋 系統要求

### 最低要求
- PHP 7.4+ (推薦 7.4/8.1)
- MySQL 5.7.8+ (寶塔面板 5.7.44 完全支持)
- PDO MySQL 擴展
- Git (用於系統更新)

### Docker 要求
- Docker 20.10+
- Docker Compose 2.0+

---

## 🚀 快速開始

### 方式一：Docker 部署（⭐ 推薦）

**適用場景**：開發、測試、生產環境

#### 1. 克隆倉庫

```bash
git clone https://github.com/DylanChiang-Dev/family-task-manager.git
cd family-task-manager
```

#### 2. 啟動服務

```bash
# 啟動所有容器（PHP-FPM, Nginx, MySQL, phpMyAdmin）
docker-compose up -d

# 查看容器狀態
docker-compose ps

# 查看日誌
docker-compose logs -f
```

#### 3. 訪問應用

| 服務 | 地址 |
|------|------|
| **主應用** | http://localhost:8080 |
| **phpMyAdmin** | http://localhost:8081 |
| **MySQL** | localhost:3306 |

#### 4. 完成安裝向導

訪問 http://localhost:8080，按照4步安裝向導操作：

**步驟1：環境檢查**
- 自動檢測 PHP 版本、擴展、權限

**步驟2：數據庫配置**
- 主機：`db`（Docker 內部服務名，不是 localhost）
- 端口：`3306`
- 數據庫：`family_tasks`
- 用戶名：`family_user`
- 密碼：`family_pass`

**步驟3：管理員賬號**
- 創建第一個管理員賬號

**步驟4：完成**
- 開始使用系統！

#### 5. 常用 Docker 命令

```bash
# 停止服務
docker-compose down

# 停止並刪除數據（⚠️ 會清空數據庫）
docker-compose down -v

# 重啟服務
docker-compose restart

# 重新構建容器
docker-compose up -d --build

# 進入 MySQL 容器
docker-compose exec db mysql -u root -proot family_tasks

# 進入 PHP 容器
docker-compose exec web sh

# 查看 Nginx 日誌
docker-compose logs nginx

# 數據庫備份
docker-compose exec db mysqldump -u root -proot --default-character-set=utf8mb4 family_tasks > backup_$(date +%Y%m%d).sql

# 數據庫恢復
docker-compose exec -T db mysql -u root -proot --default-character-set=utf8mb4 family_tasks < backup.sql
```

---

### 方式二：寶塔面板 / aaPanel 部署（⭐ 生產環境推薦）

**適用場景**：使用寶塔面板或 aaPanel 的生產服務器

#### 1. 安裝寶塔面板

**中國大陸用戶（寶塔面板）**：

```bash
# CentOS 安裝
yum install -y wget && wget -O install.sh https://download.bt.cn/install/install_6.0.sh && sh install.sh ed8484bec

# Ubuntu/Debian 安裝
wget -O install.sh https://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh ed8484bec
```

**國際用戶（aaPanel）**：

```bash
# CentOS 安裝
yum install -y wget && wget -O install.sh http://www.aapanel.com/script/install_6.0_en.sh && bash install.sh aapanel

# Ubuntu/Debian 安裝
wget -O install.sh http://www.aapanel.com/script/install-ubuntu_6.0_en.sh && sudo bash install.sh aapanel
```

安裝完成後記錄面板地址、用戶名和密碼。

#### 2. 安裝軟件環境

訪問面板（`http://你的服務器IP:8888`），進入「軟件商店」安裝：

- **Nginx**：推薦編譯安裝（穩定）
- **PHP 7.4+**：必須安裝以下擴展
  - ✅ `pdo_mysql`（必需）
  - ✅ `mysqli`（必需）
  - ✅ `mbstring`（必需）
  - ✅ `opcache`（性能優化）
  - ✅ `fileinfo`（文件信息）
- **MySQL 5.7/8.0**：記錄 root 密碼（寶塔面板 5.7.44 完全支持）

#### 3. 添加站點

點擊左側「網站」→「添加站點」：

| 字段 | 值 |
|------|------|
| **域名** | 您的域名或 IP 地址 |
| **根目錄** | `/www/wwwroot/family-task-manager` |
| **FTP** | 不創建 |
| **數據庫** | MySQL（記錄數據庫名、用戶名、密碼）|
| **PHP 版本** | 選擇 PHP 7.4+ |

#### 4. 部署項目

**方式 A：Git 部署（推薦）**

```bash
# SSH 連接服務器後
cd /www/wwwroot
rm -rf family-task-manager  # 刪除寶塔創建的空目錄

# 克隆項目
git clone https://github.com/DylanChiang-Dev/family-task-manager.git
cd family-task-manager
```

**方式 B：ZIP 上傳**

1. 下載 [最新版本 ZIP](https://github.com/DylanChiang-Dev/family-task-manager/releases)
2. 進入站點根目錄文件管理器
3. 上傳 ZIP 並解壓

#### 5. 配置站點

在網站設置中：

**A. 設置運行目錄**
- 點擊「網站目錄」
- **運行目錄**選擇 `/public`
- 勾選「防跨站攻擊」
- 點擊「保存」

**B. 設置偽靜態**
- 點擊「偽靜態」
- 選擇 **laravel5** 或手動添加：

```nginx
location / {
    try_files $uri $uri/ /index.php?$query_string;
}

location ~ \.php$ {
    fastcgi_pass unix:/tmp/php-cgi-81.sock;
    fastcgi_index index.php;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
}
```

#### 6. 設置權限

```bash
cd /www/wwwroot/family-task-manager

# 設置 config 目錄權限（安裝時需要可寫）
chmod -R 777 config/

# 設置所有者為 www
chown -R www:www /www/wwwroot/family-task-manager
```

#### 7. 完成安裝

訪問您的域名或 IP，按照安裝向導操作：

- **步驟 1**：環境檢查（自動）
- **步驟 2**：數據庫配置（填寫步驟 3 創建的數據庫信息）
- **步驟 3**：創建管理員賬號
- **步驟 4**：完成！

#### 8. 安裝後安全加固

```bash
cd /www/wwwroot/family-task-manager

# 刪除安裝目錄（重要！）
rm -rf public/install/

# 設置 config 目錄為只讀
chmod -R 755 config/
```

#### 9. 配置 SSL（可選但推薦）

在站點設置中：
- 點擊「SSL」→「Let's Encrypt」
- 勾選您的域名 → 點擊「申請」
- 勾選「強制 HTTPS」

#### 常見問題

**Q: 訪問站點顯示 404**
- 檢查運行目錄是否設置為 `/public`

**Q: 數據庫連接失敗**
- 確認數據庫名、用戶名、密碼正確
- 主機填寫 `localhost` 或 `127.0.0.1`

**Q: PHP 擴展缺失**
- 軟件商店 → PHP 7.4 → 設置 → 安裝擴展

**Q: 中文字符亂碼**
- 進入 phpMyAdmin 執行：
  ```sql
  ALTER DATABASE 數據庫名 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  ```

詳細文檔：[BAOTA_GUIDE.md](BAOTA_GUIDE.md) | [DOCKER_GUIDE.md](DOCKER_GUIDE.md)

---

### 方式三：PHP 內置服務器（僅開發用）

**⚠️ 僅用於開發和測試，不要在生產環境使用！**

```bash
# 1. 創建數據庫
mysql -u root -p -e "CREATE DATABASE family_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. 啟動開發服務器
cd public
php -S localhost:8000

# 3. 訪問 http://localhost:8000
```

---

## 📚 文檔

### 項目結構

```
family-task-manager/
├── config/                       # 配置文件（不提交到 Git）
│   ├── database.php              # 數據庫配置
│   ├── config.php                # 應用配置
│   └── installed.lock            # 安裝鎖定文件
├── database/
│   ├── schema.sql                # 數據庫表結構
│   ├── seed_demo_tasks.sql      # 示例數據
│   └── migrations/               # 數據庫遷移目錄
│       ├── README.md             # 遷移系統文檔
│       └── *.sql                 # 遷移文件
├── docker/
│   ├── nginx/
│   │   └── default.conf          # Nginx 虛擬主機配置
│   └── php/
│       └── php.ini               # PHP 配置
├── lib/                          # 輔助類庫
│   ├── Database.php              # 數據庫單例
│   └── TeamHelper.php            # 團隊輔助函數
├── public/                       # Web 根目錄
│   ├── index.php                 # 主應用入口
│   ├── api/                      # RESTful API 端點
│   │   ├── auth.php              # 認證 API（登錄/註冊/登出）
│   │   ├── tasks.php             # 任務 CRUD API
│   │   ├── users.php             # 用戶列表 API
│   │   ├── teams.php             # 團隊管理 API
│   │   ├── profile.php           # 用戶資料 API
│   │   └── update.php            # 系統更新 API
│   ├── install/                  # 安裝向導（安裝後刪除）
│   │   ├── index.php             # 安裝入口
│   │   ├── step1.php             # 環境檢查
│   │   ├── step2.php             # 數據庫配置
│   │   ├── step3.php             # 管理員創建
│   │   └── step4.php             # 安裝完成
│   ├── css/
│   │   └── style.css             # 自定義樣式
│   └── js/
│       ├── app.js                # 前端邏輯
│       └── lunar.js              # 農曆轉換庫
├── scripts/                      # 系統腳本
│   ├── migrate.php               # 遷移執行腳本
│   └── make-migration.php        # 遷移生成工具
├── docker-compose.yml            # Docker 服務定義
├── Dockerfile                    # PHP-FPM 鏡像
├── update.sh                     # 系統更新腳本
├── .env.example                  # 環境變量示例
├── CLAUDE.md                     # 項目技術文檔
└── README.md                     # 本文件
```

### API 文檔

#### 認證 API (`/api/auth.php`)

```bash
# 註冊
POST /api/auth.php?action=register
Body: { username, nickname, password, register_mode, team_name/invite_code }

# 登錄
POST /api/auth.php?action=login
Body: { username, password }

# 登出
POST /api/auth.php?action=logout

# 檢查登錄狀態
GET /api/auth.php?action=check
```

#### 任務 API (`/api/tasks.php`)

```bash
# 獲取所有任務
GET /api/tasks.php

# 按狀態過濾
GET /api/tasks.php?status=pending

# 創建任務
POST /api/tasks.php
Body: { title, description, assignee_id, priority, status, due_date, task_type, recurrence_config }

# 更新任務
PUT /api/tasks.php?id=123
Body: { title, description, ... }

# 刪除任務
DELETE /api/tasks.php?id=123
```

#### 團隊 API (`/api/teams.php`)

```bash
# 獲取用戶的所有團隊
GET /api/teams.php

# 創建新團隊
POST /api/teams.php
Body: { name }

# 加入團隊
POST /api/teams.php?action=join
Body: { invite_code }

# 切換團隊
POST /api/teams.php?action=switch
Body: { team_id }

# 更新團隊（管理員）
PUT /api/teams.php?id=123
Body: { name }

# 刪除團隊（管理員）
DELETE /api/teams.php?id=123

# 獲取團隊成員
GET /api/teams.php?id=123&action=members

# 重新生成邀請碼（管理員）
POST /api/teams.php?id=123&action=regenerate_code

# 移除成員（管理員）
DELETE /api/teams.php?id=123&user_id=456
```

#### 系統更新 API (`/api/update.php`)

```bash
# 獲取版本信息
GET /api/update.php?action=version

# 檢查更新
GET /api/update.php?action=check

# 執行更新（管理員）
POST /api/update.php?action=update
```

---

## 🔄 數據庫遷移系統

本系統內置完整的數據庫遷移管理，類似 Laravel Migrations。

### 創建遷移

```bash
# 使用命令生成遷移文件
php scripts/make-migration.php "add user avatar column"

# 生成：database/migrations/20250103120000_add_user_avatar_column.sql
```

### 編寫遷移

```sql
-- 20250103120000_add_user_avatar_column.sql
-- 添加用戶頭像欄位

ALTER TABLE users
ADD COLUMN avatar_url VARCHAR(255) NULL COMMENT '頭像URL' AFTER nickname;

ALTER TABLE users ADD INDEX idx_avatar (avatar_url);
```

### 執行遷移

```bash
# 查看遷移狀態
php scripts/migrate.php --status

# 執行所有待執行的遷移
php scripts/migrate.php

# 回滾最後一次遷移（需要 .down.sql 文件）
php scripts/migrate.php --rollback
```

### 自動遷移

更新系統時會自動執行遷移：

```bash
bash update.sh  # 自動拉取代碼並執行遷移
```

詳細文檔：[database/migrations/README.md](database/migrations/README.md)

---

## 🔧 系統更新

### 通過 Web 界面更新

1. 登錄系統
2. 點擊「設置」→「個人設置」
3. 滾動到「系統更新」區域
4. 點擊「檢查更新」
5. 如有新版本，點擊「立即更新」

### 通過命令行更新

```bash
bash update.sh
```

更新腳本會自動：
- ✅ 拉取最新代碼
- ✅ 備份配置文件
- ✅ 執行數據庫遷移
- ✅ 恢復配置文件
- ✅ 設置文件權限（寶塔面板）
- ✅ 顯示更新日誌

**要求**：項目必須使用 Git 部署（不支持 ZIP 上傳）

---

## 🐛 常見問題

### 1. Docker 容器啟動失敗

```bash
# 查看日誌
docker-compose logs

# 檢查端口占用
sudo lsof -i :8080
sudo lsof -i :3306

# 修改端口（編輯 docker-compose.yml）
ports:
  - "8888:80"  # 改為 8888
```

### 2. config 目錄無寫權限

```bash
chmod -R 777 config/
```

### 3. 中文字符亂碼

確保數據庫使用 UTF-8：

```sql
ALTER DATABASE family_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

導入數據時使用：

```bash
mysql --default-character-set=utf8mb4 family_tasks < file.sql
```

### 4. Docker 環境數據庫連接失敗

確保使用服務名 `db` 而不是 `localhost`：

```
主機: db  ✅
主機: localhost  ❌
```

### 5. 重置安裝

```bash
# 刪除配置文件
rm -f config/installed.lock config/database.php config/config.php

# Docker 環境重置數據庫
docker-compose exec db mysql -u root -proot -e "DROP DATABASE family_tasks; CREATE DATABASE family_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 6. 更新失敗

```bash
# 檢查 Git 倉庫狀態
git status

# 放棄本地修改
git reset --hard

# 重新執行更新
bash update.sh
```

---

## 📸 截圖

> TODO: 添加應用截圖

---

## 🗺️ 路線圖

- [ ] 任務評論功能
- [ ] 文件附件上傳
- [ ] 任務標籤系統
- [ ] 郵件通知
- [ ] WebSocket 實時更新
- [ ] 移動端 APP
- [ ] 數據導出（Excel/CSV）
- [ ] 任務模板
- [ ] 甘特圖視圖

---

## 🤝 貢獻

歡迎貢獻！請遵循以下步驟：

### 提交 Issue

- 使用清晰的標題描述問題
- 提供詳細的復現步驟
- 附上錯誤日誌和截圖
- 說明您的環境（PHP版本、MySQL版本、操作系統等）

### 提交 Pull Request

1. Fork 本倉庫
2. 創建特性分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'Add some AmazingFeature'`
4. 推送到分支：`git push origin feature/AmazingFeature`
5. 開啟 Pull Request

### 代碼規範

- PHP 遵循 PSR-12 編碼規範
- 使用繁體中文註釋
- 所有 API 必須返回 JSON 格式
- 數據庫操作必須使用 PDO 預處理語句
- 前端使用原生 JavaScript（無需構建工具）

### 提交信息規範

```
feat: 添加任務評論功能
fix: 修復任務刪除後團隊切換錯誤
docs: 更新 README 安裝說明
style: 格式化代碼
refactor: 重構團隊管理 API
test: 添加單元測試
chore: 更新依賴
```

---

## 📄 開源協議

本項目採用 [MIT License](LICENSE) 開源協議。

您可以自由地：
- ✅ 使用本項目用於商業用途
- ✅ 修改源代碼
- ✅ 分發本項目
- ✅ 私有使用

唯一要求：
- 保留版權聲明和許可證聲明

---

## 👨‍💻 作者

**Dylan Chiang**

- GitHub: [@DylanChiang-Dev](https://github.com/DylanChiang-Dev)

---

## 🙏 致謝

感謝以下開源項目：

- [PHP](https://www.php.net/) - 後端語言
- [MySQL](https://www.mysql.com/) - 數據庫
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Docker](https://www.docker.com/) - 容器化平台
- [Material Symbols](https://fonts.google.com/icons) - 圖標庫

---

## ⭐ Star History

如果這個項目對您有幫助，請給一個 ⭐️ Star！

[![Star History Chart](https://api.star-history.com/svg?repos=DylanChiang-Dev/family-task-manager&type=Date)](https://star-history.com/#DylanChiang-Dev/family-task-manager&Date)

---

## 📞 支持

遇到問題？

- 📖 查看 [文檔](https://github.com/DylanChiang-Dev/family-task-manager/wiki)
- 🐛 提交 [Issue](https://github.com/DylanChiang-Dev/family-task-manager/issues)
- 💬 參與 [Discussions](https://github.com/DylanChiang-Dev/family-task-manager/discussions)

---

<div align="center">

**Built with ❤️ using PHP, MySQL, and Tailwind CSS**

[⬆ 回到頂部](#家庭任務管理系統--family-task-manager)

</div>
