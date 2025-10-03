# Docker 部署指南

本指南詳細說明如何使用 Docker 部署和管理「家庭任務管理系統」。

## 目錄

- [系統架構](#系統架構)
- [快速開始](#快速開始)
- [配置說明](#配置說明)
- [常用命令](#常用命令)
- [數據管理](#數據管理)
- [故障排除](#故障排除)
- [生產環境部署](#生產環境部署)

---

## 系統架構

Docker Compose 會啟動 4 個容器：

```
┌─────────────────────────────────────────┐
│         Nginx (Port 8080)               │
│         反向代理 + 靜態文件服務         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         PHP-FPM (Port 9000)             │
│         應用程序邏輯處理                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         MySQL 8.0 (Port 3306)           │
│         數據庫 (持久化存儲)             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      phpMyAdmin (Port 8081)             │
│      數據庫管理界面                     │
└─────────────────────────────────────────┘
```

## 快速開始

### 1. 前置要求

```bash
# 安裝 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 安裝 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 驗證安裝
docker --version
docker-compose --version
```

### 2. 啟動服務

```bash
git clone https://github.com/DylanChiang-Dev/family-task-manager.git
cd family-task-manager
docker-compose up -d
```

### 3. 驗證部署

```bash
# 檢查容器狀態
docker-compose ps

# 應該看到 4 個容器都是 Up 狀態
NAME                      STATUS
family-tasks-nginx        Up
family-tasks-php          Up
family-tasks-mysql        Up
family-tasks-phpmyadmin   Up
```

### 4. 訪問應用

| 服務 | URL | 憑證 |
|------|-----|------|
| 主應用 | http://localhost:8080 | 安裝向導創建 |
| phpMyAdmin | http://localhost:8081 | root / root |
| MySQL | localhost:3306 | family_user / family_pass |

---

## 配置說明

### docker-compose.yml 結構

```yaml
services:
  # PHP-FPM 容器
  web:
    build: .                    # 使用 Dockerfile 構建
    volumes:
      - .:/var/www/html         # 掛載項目目錄（實時同步）
    networks:
      - family-tasks-network
    depends_on:
      - db                      # 依賴 MySQL

  # Nginx 容器
  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"               # 端口映射：主機:容器
    volumes:
      - .:/var/www/html
      - ./docker/nginx/default.conf:/etc/nginx/conf.d/default.conf

  # MySQL 容器
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: family_tasks
      MYSQL_USER: family_user
      MYSQL_PASSWORD: family_pass
    volumes:
      - family-tasks-db:/var/lib/mysql  # 持久化數據
    command: --default-authentication-plugin=mysql_native_password

  # phpMyAdmin 容器
  phpmyadmin:
    image: phpmyadmin/phpmyadmin
    ports:
      - "8081:80"
    environment:
      PMA_HOST: db
```

### 自定義端口

編輯 `docker-compose.yml`：

```yaml
nginx:
  ports:
    - "8888:80"  # 改為 8888

phpmyadmin:
  ports:
    - "8082:80"  # 改為 8082
```

重新啟動：

```bash
docker-compose down
docker-compose up -d
```

### 自定義數據庫憑證

編輯 `docker-compose.yml`：

```yaml
db:
  environment:
    MYSQL_ROOT_PASSWORD: your_root_password
    MYSQL_DATABASE: your_database_name
    MYSQL_USER: your_username
    MYSQL_PASSWORD: your_password
```

**⚠️ 重要**：修改後需要重新創建容器和數據卷：

```bash
docker-compose down -v  # 刪除數據卷
docker-compose up -d
```

---

## 常用命令

### 容器管理

```bash
# 啟動服務（後台運行）
docker-compose up -d

# 啟動服務（前台運行，查看實時日誌）
docker-compose up

# 停止服務
docker-compose down

# 停止並刪除數據卷（⚠️ 會刪除數據庫數據）
docker-compose down -v

# 重啟服務
docker-compose restart

# 重啟單個服務
docker-compose restart nginx

# 重新構建容器
docker-compose up -d --build

# 查看容器狀態
docker-compose ps

# 查看資源使用情況
docker stats
```

### 日誌查看

```bash
# 查看所有容器日誌
docker-compose logs

# 實時查看日誌
docker-compose logs -f

# 查看特定容器日誌
docker-compose logs nginx
docker-compose logs web
docker-compose logs db

# 查看最後 100 行日誌
docker-compose logs --tail=100
```

### 進入容器

```bash
# 進入 PHP 容器
docker-compose exec web sh

# 進入 MySQL 容器
docker-compose exec db bash

# 進入 Nginx 容器
docker-compose exec nginx sh
```

### 執行命令

```bash
# 在 PHP 容器中執行 PHP 命令
docker-compose exec web php -v
docker-compose exec web php scripts/migrate.php

# 在 MySQL 容器中執行 SQL
docker-compose exec db mysql -u root -proot -e "SHOW DATABASES;"
```

---

## 數據管理

### 數據庫備份

```bash
# 備份數據庫
docker-compose exec db mysqldump \
  -u root -proot \
  --default-character-set=utf8mb4 \
  family_tasks > backup_$(date +%Y%m%d_%H%M%S).sql

# 備份所有數據庫
docker-compose exec db mysqldump \
  -u root -proot \
  --all-databases > full_backup_$(date +%Y%m%d_%H%M%S).sql
```

### 數據庫恢復

```bash
# 恢復數據庫
docker-compose exec -T db mysql \
  -u root -proot \
  --default-character-set=utf8mb4 \
  family_tasks < backup.sql

# 如果需要先刪除數據庫
docker-compose exec db mysql -u root -proot -e "
  DROP DATABASE IF EXISTS family_tasks;
  CREATE DATABASE family_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
"

docker-compose exec -T db mysql \
  -u root -proot \
  family_tasks < backup.sql
```

### 數據卷管理

```bash
# 查看數據卷
docker volume ls | grep family-tasks

# 查看數據卷詳情
docker volume inspect family-tasks-db

# 刪除數據卷（⚠️ 會永久刪除數據）
docker volume rm family-tasks-db

# 備份數據卷
docker run --rm \
  -v family-tasks-db:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/db-backup.tar.gz -C /data .

# 恢復數據卷
docker run --rm \
  -v family-tasks-db:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/db-backup.tar.gz"
```

---

## 故障排除

### 容器無法啟動

```bash
# 查看詳細錯誤日誌
docker-compose logs

# 檢查配置文件語法
docker-compose config

# 重新構建並啟動
docker-compose down
docker-compose up -d --build
```

### 端口已被占用

```bash
# 檢查端口占用
sudo lsof -i :8080
sudo lsof -i :3306

# 修改 docker-compose.yml 中的端口
# 或停止占用端口的程序
sudo kill <PID>
```

### 數據庫連接失敗

**常見原因**：安裝向導中主機填寫錯誤

❌ 錯誤：`localhost` 或 `127.0.0.1`
✅ 正確：`db`（Docker 服務名）

**驗證連接**：

```bash
# 進入 PHP 容器測試
docker-compose exec web sh
ping db  # 應該能 ping 通
```

### MySQL 字符集問題

```bash
# 進入 MySQL 容器
docker-compose exec db mysql -u root -proot

# 檢查字符集
SHOW VARIABLES LIKE 'character_set%';

# 修改數據庫字符集
ALTER DATABASE family_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 權限問題

```bash
# 給 config 目錄添加寫權限
chmod -R 777 config/

# 在 Docker 容器中
docker-compose exec web sh
chown -R www-data:www-data /var/www/html/config
```

### 清理 Docker 資源

```bash
# 停止所有容器
docker-compose down

# 刪除未使用的容器
docker container prune

# 刪除未使用的鏡像
docker image prune

# 刪除未使用的卷
docker volume prune

# 清理所有未使用的資源
docker system prune -a
```

---

## 生產環境部署

### 1. 安全配置

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  db:
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}  # 使用環境變量
      MYSQL_PASSWORD: ${DB_PASSWORD}
    restart: always                              # 自動重啟
    
  nginx:
    restart: always
    # 可以添加 SSL 證書掛載
    volumes:
      - ./ssl:/etc/nginx/ssl
```

### 2. 使用環境變量

創建 `.env` 文件：

```bash
# .env
DB_ROOT_PASSWORD=your_secure_root_password
DB_PASSWORD=your_secure_password
```

啟動：

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 3. 反向代理（Nginx）

如果使用外部 Nginx：

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4. HTTPS 配置

使用 Let's Encrypt：

```bash
# 安裝 certbot
sudo apt install certbot

# 獲取證書
sudo certbot certonly --standalone -d yourdomain.com

# 掛載證書到 Nginx 容器
# 編輯 docker-compose.yml
volumes:
  - /etc/letsencrypt:/etc/letsencrypt:ro
```

### 5. 定時備份

創建 cron 任務：

```bash
# 編輯 crontab
crontab -e

# 每天凌晨 2 點備份
0 2 * * * /path/to/backup.sh

# backup.sh 內容
#!/bin/bash
cd /path/to/family-task-manager
docker-compose exec -T db mysqldump \
  -u root -p$DB_ROOT_PASSWORD \
  --default-character-set=utf8mb4 \
  family_tasks > /backups/family_tasks_$(date +\%Y\%m\%d).sql
# 刪除 30 天前的備份
find /backups -name "family_tasks_*.sql" -mtime +30 -delete
```

### 6. 監控

使用 Docker Stats：

```bash
# 實時監控資源使用
docker stats
```

使用 Docker Healthcheck：

```yaml
services:
  web:
    healthcheck:
      test: ["CMD", "php", "-v"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 性能優化

### PHP-FPM 優化

編輯 `docker/php/php.ini`：

```ini
memory_limit = 256M
max_execution_time = 300
upload_max_filesize = 64M
post_max_size = 64M
```

### MySQL 優化

編輯 `docker-compose.yml`：

```yaml
db:
  command: >
    --default-authentication-plugin=mysql_native_password
    --max_connections=200
    --innodb_buffer_pool_size=256M
```

### Nginx 緩存

編輯 `docker/nginx/default.conf`：

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 365d;
    add_header Cache-Control "public, immutable";
}
```

---

## 升級和維護

### 更新 Docker 鏡像

```bash
# 拉取最新鏡像
docker-compose pull

# 重新創建容器
docker-compose up -d
```

### 系統更新

```bash
# 進入項目目錄
cd /path/to/family-task-manager

# 執行更新腳本
bash update.sh

# 或手動更新
git pull
docker-compose exec web php scripts/migrate.php
docker-compose restart
```

---

## 參考資源

- [Docker 官方文檔](https://docs.docker.com/)
- [Docker Compose 文檔](https://docs.docker.com/compose/)
- [MySQL Docker Hub](https://hub.docker.com/_/mysql)
- [Nginx Docker Hub](https://hub.docker.com/_/nginx)
- [PHP-FPM Docker Hub](https://hub.docker.com/_/php)

---

需要幫助？請查看 [README.md](README.md) 或提交 [Issue](https://github.com/DylanChiang-Dev/family-task-manager/issues)。
