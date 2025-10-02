# 數據庫管理說明

## 字符編碼重要提示 ⚠️

### 問題
MySQL 默認連接使用 `latin1` 編碼，導致中文數據插入時出現亂碼。

### 解決方案
所有數據庫操作必須指定 UTF-8 字符集：

```bash
# ✅ 正確方式（使用 --default-character-set=utf8mb4）
docker compose exec db mysql -u root -proot --default-character-set=utf8mb4 family_tasks < file.sql

# ❌ 錯誤方式（會導致亂碼）
docker compose exec db mysql -u root -proot family_tasks < file.sql
```

## 常用操作

### 1. 導入示例任務

```bash
# 清除現有任務並導入示例數據
docker compose exec db mysql -u root -proot --default-character-set=utf8mb4 -e "DELETE FROM tasks; ALTER TABLE tasks AUTO_INCREMENT = 1;" family_tasks

docker compose exec db mysql -u root -proot --default-character-set=utf8mb4 family_tasks < database/seed_demo_tasks.sql
```

### 2. 應用數據庫遷移

```bash
# 添加週期任務支持
docker compose exec db mysql -u root -proot --default-character-set=utf8mb4 family_tasks < database/migrations/add_recurring_tasks.sql
```

### 3. 查詢任務數據

```bash
# 查看所有任務（確保使用 UTF-8）
docker compose exec db mysql -u root -proot --default-character-set=utf8mb4 -e "SELECT id, title, priority, status, due_date FROM tasks;" family_tasks
```

### 4. 檢查字符集設置

```bash
# 檢查數據庫字符集
docker compose exec db mysql -u root -proot -e "SHOW CREATE DATABASE family_tasks\G" family_tasks

# 檢查連接字符集
docker compose exec db mysql -u root -proot -e "SHOW VARIABLES LIKE 'character_set%';" family_tasks
```

### 5. 備份和恢復

```bash
# 備份（使用 UTF-8）
docker compose exec db mysqldump -u root -proot --default-character-set=utf8mb4 family_tasks > backup.sql

# 恢復（使用 UTF-8）
docker compose exec db mysql -u root -proot --default-character-set=utf8mb4 family_tasks < backup.sql
```

## 數據庫架構

### 字符集配置
- **數據庫**：`utf8mb4` (支持完整 Unicode，包括 Emoji)
- **排序規則**：`utf8mb4_unicode_ci` (不區分大小寫)
- **連接**：必須使用 `--default-character-set=utf8mb4`

### 表結構
- `users` - 用戶表
- `tasks` - 任務表
- `task_comments` - 任務評論表（未使用）

### 外鍵約束
- `tasks.creator_id` → `users.id` (CASCADE)
- `tasks.assignee_id` → `users.id` (SET NULL)
- `tasks.parent_task_id` → `tasks.id` (CASCADE)

## 示例任務說明

`seed_demo_tasks.sql` 包含 16 個示例任務：

### 分類
1. **今日任務** (3個)：準備晚餐、檢查作業、倒垃圾
2. **明日任務** (2個)：買菜、接孩子放學
3. **本週任務** (3個)：繳水電費、預約牙醫、洗車
4. **下週任務** (2個)：家長會、買禮物
5. **週期任務** (4個)：晨跑、記帳、打掃客廳、還房貸
6. **已完成任務** (2個)：洗衣服、整理房間

### 優先級分佈
- 🔴 高優先級：6 個
- 🔵 中優先級：7 個
- 🟢 低優先級：3 個

### 任務類型分佈
- 一般任務：12 個
- 週期任務：4 個
  - 每天重複：2 個
  - 每週重複：1 個
  - 每月重複：1 個

## 故障排除

### 中文顯示亂碼
**症狀**：任務標題顯示為 `æ´—è¡£æœ` 等亂碼

**解決**：
1. 刪除現有數據
2. 使用 `--default-character-set=utf8mb4` 重新導入
3. 重啟 PHP 服務

```bash
docker compose exec db mysql -u root -proot --default-character-set=utf8mb4 -e "DELETE FROM tasks;" family_tasks
docker compose exec db mysql -u root -proot --default-character-set=utf8mb4 family_tasks < database/seed_demo_tasks.sql
docker compose restart web
```

### 外鍵約束錯誤
**症狀**：`ERROR 1452 (23000): Cannot add or update a child row`

**原因**：嘗試插入的 `creator_id` 或 `assignee_id` 在 `users` 表中不存在

**解決**：腳本使用動態查詢 `SET @user_id = (SELECT id FROM users LIMIT 1)` 自動獲取有效用戶 ID

## PHP 應用配置

應用已正確配置 UTF-8：
- `lib/Database.php` 第 26 行：`charset=utf8mb4`
- `lib/Database.php` 第 32 行：`SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci`

無需手動修改 PHP 代碼。
