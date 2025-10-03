# 快速開始指南

本指南將幫助您在 5 分鐘內使用 Docker 啟動「家庭任務管理系統」。

## 前置要求

確保您已安裝：
- **Docker** 20.10+
- **Docker Compose** 2.0+

檢查版本：
```bash
docker --version
docker-compose --version
```

## 快速安裝步驟

### 1. 克隆項目

```bash
git clone https://github.com/DylanChiang-Dev/family-task-manager.git
cd family-task-manager
```

### 2. 啟動 Docker 容器

```bash
docker-compose up -d
```

這將啟動 4 個容器：
- ✅ PHP-FPM (後端)
- ✅ Nginx (Web 服務器)
- ✅ MySQL (數據庫)
- ✅ phpMyAdmin (數據庫管理工具)

### 3. 檢查容器狀態

```bash
docker-compose ps
```

應該看到所有容器狀態為 `Up`。

### 4. 訪問應用

打開瀏覽器訪問：**http://localhost:8080**

### 5. 完成安裝向導

#### 步驟 1：環境檢查
系統自動檢測 PHP 版本和擴展，點擊「下一步」。

#### 步驟 2：數據庫配置
填寫以下信息：

| 字段 | 值 |
|------|------|
| **主機** | `db` ⚠️ 重要：不是 localhost |
| **端口** | `3306` |
| **數據庫名** | `family_tasks` |
| **用戶名** | `family_user` |
| **密碼** | `family_pass` |

點擊「測試連接」→ 成功後點擊「下一步」。

#### 步驟 3：創建管理員賬號
填寫您的管理員信息：
- **郵箱**：例如 admin@gmail.com
- **暱稱**：例如 管理員
- **密碼**：至少 6 個字符
- **確認密碼**：與密碼相同
- **團隊名稱**：例如 我的家庭

點擊「安裝」。

#### 步驟 4：完成！
看到成功頁面後，點擊「進入系統」開始使用！

## 常用命令

```bash
# 停止所有容器
docker-compose down

# 重啟容器
docker-compose restart

# 查看日誌
docker-compose logs -f

# 進入 MySQL 數據庫
docker-compose exec db mysql -u root -proot family_tasks

# 備份數據庫
docker-compose exec db mysqldump -u root -proot --default-character-set=utf8mb4 family_tasks > backup.sql
```

## 默認訪問地址

| 服務 | 地址 | 說明 |
|------|------|------|
| **主應用** | http://localhost:8080 | 任務管理系統 |
| **phpMyAdmin** | http://localhost:8081 | 數據庫管理界面 |

## 遇到問題？

### 端口被占用

編輯 `docker-compose.yml`，修改端口號：

```yaml
nginx:
  ports:
    - "8888:80"  # 改為 8888
```

### 容器啟動失敗

```bash
# 查看錯誤日誌
docker-compose logs

# 重新構建容器
docker-compose up -d --build
```

### 數據庫連接失敗

確保：
1. 主機名使用 `db` 而不是 `localhost`
2. 容器正在運行：`docker-compose ps`

### 重置系統

```bash
# 停止並刪除所有數據
docker-compose down -v

# 刪除配置文件
rm -f config/installed.lock config/database.php config/config.php

# 重新啟動
docker-compose up -d
```

## 下一步

- 📖 閱讀完整文檔：[README.md](README.md)
- 🔧 了解數據庫遷移：[database/migrations/README.md](database/migrations/README.md)
- 💡 查看項目技術細節：[CLAUDE.md](CLAUDE.md)

## 需要幫助？

- 🐛 [提交 Issue](https://github.com/DylanChiang-Dev/family-task-manager/issues)
- 💬 [參與討論](https://github.com/DylanChiang-Dev/family-task-manager/discussions)

祝使用愉快！ 🎉
