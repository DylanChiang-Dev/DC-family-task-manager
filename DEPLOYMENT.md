# 部署指南 | Family Task Manager

<div align="center">

![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20macOS-blue)
![Environment](https://img.shields.io/badge/Environment-Production%20Ready-green)
![Docker](https://img.shields.io/badge/Docker-Supported-blue)
![License](https://img.shields.io/badge/license-MIT-green)

家庭任務管理系統完整部署指南，適用於開發、測試和生產環境

</div>

---

## 📋 目錄

- [🚀 部署選擇](#-部署選擇)
- [🐳 Docker 部署](#-docker-部署)
- [🖥️ 寶塔面板部署](#️-寶塔面板部署)
- [🛠️ PHP 內置服務器](#️-php-內置服務器)
- [📋 部署後配置](#-部署後配置)
- [🔧 故障排除](#-故障排除)
- [📚 參考資源](#-參考資源)

---

## 🚀 部署選擇

### 推薦部署方式

| 部署方式 | 適用場景 | 難度 | 推薦度 |
|----------|----------|------|----------|
| **Docker Compose** | 開發、測試、小型生產 | ⭐⭐⭐⭐⭐ | 🔥 **最推薦** |
| **寶塔面板** | 企業級生產部署 | ⭐⭐⭐⭐ | 🏢 **生產推薦** |
| **PHP 內置服務器** | 本地開發測試 | ⭐⭐ | ⚠️ **僅開發** |

### 選擇建議

**個人項目/學習**：Docker Compose 或 PHP 內置服務器
**小型團隊**：Docker Compose
**企業部署**：寶塔面板
**大規模部署**：寶塔面板 + 集群

---

## 🐳 Docker 部署

### 系統要求

**硬體要求**
- CPU：2 核心以上
- 記憶：4GB RAM 以上
- 硬盤：20GB 可用空間
- 網絡：穩定的互聯網連接

**軟體要求**
- **Docker**：20.10+ 或更新版本
- **Docker Compose**：2.0+ 或更新版本
- **Git**：用於系統更新（可選）

### 快速部署

#### 1. 克隆項目

```bash
# 克隆項目倉庫
git clone https://github.com/DylanChiang-Dev/family-task-manager.git
cd family-task-manager

# 檢查項目結構
ls -la
```

#### 2. 啟動服務

```bash
# 啟動所有服務
docker compose up -d

# 檢查容器狀態
docker compose ps

# 查看日誌（可選）
docker compose logs -f
```

#### 3. 訪問應用

| 服務 | 地址 | 說明 |
|------|------|------|
| **主應用** | http://localhost:8080 | Web 應用 |
| **phpMyAdmin** | http://localhost:8081 | 數據庫管理 |
| **MySQL** | localhost:3306 | 數據庫服務 |

#### 4. 完成安裝

1. 訪問 http://localhost:8080
2. 按照 4 步安裝向導操作
3. 創建管理員賬號
4. 開始使用系統

### 高級配置

#### 自定義端口

```yaml
# 編輯 docker-compose.yml
version: '3.8'
services:
  nginx:
    ports:
      - "8888:80"  # 將 8080 改為 8888
  web:
    # ... 其他配置
```

#### 數據持久化

```yaml
# 跨輯 docker-compose.yml
services:
  db:
    volumes:
      - ./data/mysql:/var/lib/mysql  # 數據持久化到本地
    # ... 其他配置
```

#### 環境變量配置

```bash
# 創建 .env 文件
cat > .env << EOF
# 數據庫配置
MYSQL_ROOT_PASSWORD=your_strong_password
MYSQL_DATABASE=family_tasks
MYSQL_USER=family_user
MYSQL_PASSWORD=your_user_password
EOF

# 使用 .env 文件啟動
docker compose --env-file .env up -d
```

### 常用 Docker 命令

```bash
# 查看容器狀態
docker compose ps

# 查看實時日誌
docker compose logs -f [service_name]

# 重啟服務
docker compose restart

# 停止服務
docker compose down

# 停止並刪除數據
docker compose down -v

# 重建容器
docker compose up -d --build

# 進入容器
docker compose exec web sh
docker compose exec db mysql -u root -proot

# 備份數據庫
docker compose exec db mysqldump -u root -proot --default-character-set=utf8mb4 family_tasks > backup_$(date +%Y%m%d).sql

# 恢復數據庫
docker compose exec -T db mysql -u root -proot --default-character-set=utf8mb4 family_tasks < backup.sql

# 更新系統（Git 部署）
docker compose exec web bash update.sh
```

---

## 🖥️ 寶塔面板部署

### 系統準備

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

#### 2. 登錄面板

安裝完成後，通過瀏覽器訪問面板地址，使用生成的用戶名和密碼登錄。

#### 3. 安裝軟體環境

在面板「軟件商店」中安裝以下組件：

**必需組件**：
- ✅ **Nginx**：推薦編譯安裝
- ✅ **PHP 7.4+**：必須安裝以下擴展
  - `pdo_mysql`（必需）
  - `mysqli`（必需）
  - `mbstring`（必需）
  - `opcache`（性能優化）
  - `fileinfo`（文件信息）
- ✅ **MySQL 5.7/8.0**：記錄 root 密碼

**可選組件**：
- Redis（緩存）
- Supervisor（進程管理）
- SSL 證證（生產環境推薦）

### 站點配置

#### 1. 創建站點

1. 登錄寶塔面板
2. 點擊「網站」→「添加站點」
3. 配置站點信息：

| 字段 | 值 | 說明 |
|------|------|------|
| **域名** | 您的域名或 IP 地址 | 訪站地址 |
| **根目錄** | `/www/wwwroot/family-task-manager` | 項目路徑 |
| **FTP** | 不創建 | 簡化配置 |
| **數據庫** | MySQL（記錄數據庫信息）| 數據庫創建 |
| **PHP 版本** | 選擇 PHP 7.4+ | PHP 版本選擇 |

#### 2. 配置運行目錄

在站點設置中：

**A. 設置運行目錄**
- 點擊「網站目錄」
- **運行目錄**：`/public`
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

#### 3. 部署項目

**方式 A：Git 部署（推薦）**

```bash
# SSH 連接服務器
ssh root@your-server

# 進入網站根目錄
cd /www/wwwroot

# 刪除寶塔創建的空目錄
rm -rf family-task-manager

# 克隆項目
git clone https://github.com/DylanChiang-Dev/family-task-manager.git
cd family-task-manager
```

**方式 B：ZIP 上傳**

1. 下載 [最新版本 ZIP](https://github.com/DylanChiang-Dev/family-task-manager/releases)
2. 進入站點根目錄文件管理器
3. 上傳 ZIP 並解壓
4. 確保文件權限正確

#### 4. 設置權限

```bash
# 進入項目根目錄
cd /www/wwwroot/family-task-manager

# 設置 config 目錄權限（安裝時需要可寫）
chmod -R 777 config/

# 設置文件所有者為 www
chown -R www:www /www/wwwroot/family-task-manager
```

### 完成安裝

1. 訪問您的域名或 IP 地址
2. 按照 4 步安裝向導操作：

**步驟 1**：環境檢查
- 自動檢測 PHP 版本、擴展、權限
- 確保所有要求滿足

**步驟 2**：數據庫配置
- 主機：`localhost` 或 `127.0.0.1`
- 端口：`3306`
- 數據庫：`family_tasks`
- 用戶名：創建的數據庫用戶名
- 密碼：創建的數據庫密碼

**步驟 3**：創建管理員賬號
- 管理員用戶名
- 管理員密碼
- 管理員暱稱
- 選擇創建新團隊或加入現有團隊

**步驟 4**：完成！
- 系統準備就緒
- 開始使用系統

### 生產環境優化

#### SSL 配置（推薦）

1. 在站點設置中：
   - 點擊「SSL」→「Let's Encrypt」
   - 勾選您的域名 → 點擊「申請」
   - 勾選「強制 HTTPS」

2. 自動重定向 HTTP 到 HTTPS

#### 性能優化

1. **OPcache 配置**：
   - 在 PHP 設置中啟用 OPcache
   - 調整 OPcache 內存大小
   - 配置過期時間

2. **數據庫優化**：
   - 合理的索引設置
   - 查詢優化
   - 連接池配置

3. **靜態資源緩存**：
   - 靜態文件瀏覽器緩存
   - CDN 配置（可選）

---

## 🛠️ PHP 內置服務器

### ⚠️ 僅用於開發和測試

PHP 內置服務器適合快速開發和測試，不推薦用於生產環境。

### 系統要求

- PHP 7.4+ 或更高版本
- MySQL 5.7.8+ 或 8.0+
- PDO MySQL 擴展
- mbstring 擴展

### 快速啟動

#### 1. 創建數據庫

```bash
# 連接 MySQL
mysql -u root -p

# 創建數據庫
CREATE DATABASE family_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 創建數據庫用戶
CREATE USER 'family_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON family_tasks.* TO 'family_user'@'localhost';
FLUSH PRIVILEGES;
```

#### 2. 啟動服務器

```bash
# 進入 public 目錄
cd public

# 啟動 PHP 內置服務器
php -S localhost:8000

# 或指定特定端口
php -S 0.0.0.0:8000
```

#### 3. 訪問應用

- 瀡覽地址：http://localhost:8000
- 按照 4 步安裝向導完成安裝

### 開發建議

- 適用於快速原型開發
- 功能測試和驗證
- 演示和演示
- 本地開發環境

---

## 📋 部署後配置

### 安全加固

#### 1. 刪除安裝目錄

```bash
# Docker 環境
# 無需操作，容器隔離

# 寶塔面板環境
cd /www/wwwroot/family-task-manager
rm -rf public/install/

# PHP 內置服務器
# 無需操作
```

#### 2. 設置文件權限

```bash
# 寶塔面板環境
cd /www/wwwroot/family-task-manager

# 設置 config 目錄為只讀
chmod -R 755 config/

# 設置文件所有者
chown -R www:www /www/wwwroot/family-task-manager
```

#### 3. 備用配置

```bash
# 編輯 .env 文件
chmod 600 .env

# 配置文件權限
chmod 600 config/*.php
```

### 數據庫管理

#### 備份策略

```bash
# 每日備份
0 2 * * * mysqldump -u root -proot --default-character-set=utf8mb4 family_tasks > /backup/daily/backup_$(date +\%Y\%m\%d).sql

# 每週備份
0 3 * * 0 mysqldump -u root -triggers --single-transaction --routines --events --quick --lock-all-tables --flush-logs --set-gtid-purge=0 --default-character-set=utf8mb4 family_tasks > /backup/weekly/backup_$(date +\%Y\%m\%d).sql

# 即時備份
mysqldump -u root -proot --single-transaction --routines --quick --lock-all-tables --flush-logs --default-character-set=utf8mb4 family_tasks > /backup/instant/backup_$(date +\%Y\%m\%d_%H%M%S).sql
```

#### 恢復流程

```bash
# 恢復最新備份
mysql -u root -proot family_tasks < /backup/latest/backup.sql

# 恢復指定日期備份
mysql -u root -proot family_tasks < /backup/20250110/backup_20250110.sql
```

---

## 🔧 故障排除

### 常見問題

#### 1. Docker 問題

**問題**：容器啟動失敗

**解決方案**：
```bash
# 查看詳細錯誤
docker-compose logs

# 檢查端口占用
sudo lsof -i :8080
sudo lsof -i :3306

# 修改端口（編輯 docker-compose.yml）
ports:
  - "8888:80"  # 改為 8888

# 重新構建容器
docker compose up -d --build
```

**問題**：數據庫連接失敗

**解決方案**：
```bash
# 檢查數據庫服務狀態
docker compose exec db mysql ping

# 檢查連接配置
docker compose exec db mysql -u root -proot -e "SHOW DATABASES;"

# 重置數據庫
docker compose exec db mysql -u root -proot -e "DROP DATABASE IF EXISTS family_tasks; CREATE DATABASE family_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

#### 2. 寶塔面板問題

**問題**：訪問顯示 404

**解決方案**：
- 檢查運行目錄是否設置為 `/public`
- 確認偽靜態規則已設置
- 檢查 Nginx 配置語法

**問題**：數據庫連接失敗

**解決方案**：
- 確認數據庫名、用戶名、密碼正確
- 檢查主機填寫 `localhost` 或 `127.0.0.1`
- 檢查 PHP 擴展是否已安裝

**問題**：PHP 擴展缺失

**解決方案**：
- 進入面板 →「軟件商店」→「設置」→「安裝擴展」
- 安裝所需擴展：`pdo_mysql`、`mysqli`、`mbstring`、`opcache`、`fileinfo`
- 重啟 PHP-FPM 服務

**問題**：中文字符亂碼

**解決方案**：
- 進入 phpMyAdmin
- 執行：`ALTER DATABASE 數據庫名 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
- 導入數據時使用：`--default-character-set=utf8mb4`

#### 3. 配置問題

**問題**：無法上傳文件

**解決方案**：
```bash
# 檢查文件權限
ls -la config/

# 設置正確權限
chmod -R 777 config/
chown -R www:www config/
```

**問題**：更新失敗

**解決方案**：
```bash
# 檢查 Git 倉庫狀態
git status

# 檢查網絡連接
git remote -v

# 同步遠程變更
git pull origin main

# 如有衝突，解決後再同步
git reset --hard origin/main
```

**問題**：系統緩慢

**解決方案**：
- 檢查系統資源使用情況
- 優化數據庫查詢
- 啟用緩存機制
- 考慮 CDN 配置

### 日誌分析

#### 應用日誌文件

```bash
# Docker 環境
docker compose logs web
docker compose logs nginx
docker compose logs db

# 寶塔面板日誌
tail -f /www/wwwroot/family-task-manager/logs/error.log
tail -f /www/server/panel/vhost/nginx/error.log

# PHP 錯誤日誌
tail -f /www/server/php/72/php-fpm.log
```

#### �誤日誌關�詞

**Docker 容器日誌**：
- 容器啟動失敗
- 依賴關係錯誤
- �源限制問題

**寶塔面板日誌**：
- 站點配置錯誤
- 權限問題
- PHP-FPM 錯誤
- Nginx 配置錯誤

**PHP 應用日誌**：
- 語法錯誤
- 數據庫連接錯誤
- 函數調用錯誤

---

## 📚 參考資源

### 官方文檔

- [用戶手冊](https://github.com/DylanChiang-Dev/family-task-manager/wiki)
- [API 文檔](https://github.com/DylanChiang-ake-Dev/family-task-manager/blob/main/docs/API.md)
- [數據庫設計](https://github.com/DylanChiang-Dev/family-task-manager/blob/main/docs/DATABASE.md)
- [部署指南](https://github.com/DylanChiang-Dev/family-task-manager/blob/main/docs/DEPLOYMENT.md)

### 社區資源

- [GitHub Issues](https://github.com/DylanChiang-Dev/family-task-manager/issues)
- [GitHub Discussions](https://github.com/DylanChiang-Dev/family-task-manager/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/family-task-manager)
- [Reddit](https://www.reddit.com/r/family-task-manager/)

### 技術支持

- **郵件支持**：通過 GitHub Issues 獲得支持
- **社區討論**：通過 GitHub Discussions 獲得社區幫助
- **文檔更新**：持續改進和更新技術文檔

### 許可協議

本項目遵循以下許可協議：

- **MIT License**：允許商業和非商業使用
- **貢獻歡迎**：歡迎提交 Pull Request
- **文檔完整**：保持文檔的準確性和完整性
- **代碼規範**：遵循行業標準

---

## 🎯 總結

### 部署檢查清單

在完成部署後，請使用以下檢查清單確保系統正常運行：

- [ ] **環境檢查**：所有依賴項滿足最低要求
- [ ] **服務狀態**：所有服務正常運行
- [ ] **網絡訪問**：可以正常訪問 Web 應用
- [ ] **數據連接**：數據庫連接正常
- [ ] **功能測試**：核心功能可以正常使用
- [ ] **權限設置**：文件權限配置正確
- [ ] **日誌監控**：日誌記錄正常

### 維續維護

部署完成後，建議定期執行以下維護任務：

- **系統更新**：定期檢查並應用系統更新
- **數據備份**：定期備份數據庫
- **監控檢查**：監控系統性能和錯誤
- **安全更新**：及時應用安全補丁
- **日誌分析**：定期分析日誌，優化系統性能

---

<div align="center">

**感謝選擇家庭任務管理系統！**

如有問題，請參考 [故障排除](#-故障排除) 或聯繫 [技術支持](#-技術支持)。

[⬆ 回到頂部](#部署指南--family-task-manager)

</div>