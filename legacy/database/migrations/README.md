# 數據庫遷移（Database Migrations）

## 概述

數據庫遷移系統用於管理數據庫表結構的版本變更，確保所有環境的數據庫結構保持一致。

## 遷移文件命名規範

格式：`YYYYMMDDHHMMSS_description.sql`

例如：
- `20250103120000_add_recurring_tasks.sql` - 添加週期任務功能
- `20250103130000_add_user_avatar_column.sql` - 添加用戶頭像欄位

**重要**：時間戳必須遞增，建議使用當前時間。

## 遷移腳本範例

```sql
-- 20250103120000_add_recurring_tasks.sql
-- 添加週期任務支持

-- 修改 tasks 表，添加新欄位
ALTER TABLE tasks
ADD COLUMN task_type ENUM('normal', 'recurring', 'repeatable') DEFAULT 'normal' COMMENT '任務類型' AFTER status;

ALTER TABLE tasks
ADD COLUMN recurrence_config JSON NULL COMMENT '週期配置（JSON格式）' AFTER task_type;

ALTER TABLE tasks
ADD COLUMN parent_task_id INT UNSIGNED NULL COMMENT '父任務ID（重複任務的源任務）' AFTER recurrence_config;

-- 添加外鍵約束
ALTER TABLE tasks
ADD CONSTRAINT fk_parent_task
FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE SET NULL;

-- 添加索引
ALTER TABLE tasks ADD INDEX idx_task_type (task_type);
ALTER TABLE tasks ADD INDEX idx_parent_task (parent_task_id);
```

## 如何創建新的遷移

### 方法 1：使用命令生成（推薦）

```bash
php scripts/make-migration.php "add user avatar column"
```

這會創建一個帶時間戳的遷移文件，例如：`20250103150000_add_user_avatar_column.sql`

### 方法 2：手動創建

1. 創建新文件：`database/migrations/YYYYMMDDHHMMSS_description.sql`
2. 編寫 SQL 語句
3. 測試遷移：`php scripts/migrate.php`

## 執行遷移

### 自動執行（推薦）

更新系統時會自動執行未執行的遷移：

```bash
bash update.sh
```

### 手動執行

```bash
php scripts/migrate.php
```

### 檢查遷移狀態

```bash
php scripts/migrate.php --status
```

## 遷移追蹤

系統使用 `migrations` 表追蹤已執行的遷移：

```sql
CREATE TABLE migrations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    migration VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 注意事項

1. **不要修改已執行的遷移**：如果遷移已在生產環境執行，不要再修改，應創建新的遷移來修正
2. **測試遷移**：在生產環境執行前，先在開發環境測試
3. **備份數據**：執行遷移前建議備份數據庫
4. **編寫可逆遷移**：如可能，編寫回滾腳本（見下文）
5. **原子性**：每個遷移應該是獨立的、原子性的操作

## 回滾遷移（可選）

如需支持回滾，可創建對應的 `down` 文件：

- `20250103120000_add_recurring_tasks.sql` - 正向遷移
- `20250103120000_add_recurring_tasks.down.sql` - 回滾腳本

回滾範例：

```sql
-- 20250103120000_add_recurring_tasks.down.sql
-- 回滾週期任務功能

-- 移除外鍵
ALTER TABLE tasks DROP FOREIGN KEY fk_parent_task;

-- 移除索引
ALTER TABLE tasks DROP INDEX idx_task_type;
ALTER TABLE tasks DROP INDEX idx_parent_task;

-- 移除欄位
ALTER TABLE tasks DROP COLUMN parent_task_id;
ALTER TABLE tasks DROP COLUMN recurrence_config;
ALTER TABLE tasks DROP COLUMN task_type;
```

執行回滾：

```bash
php scripts/migrate.php --rollback
```

## 常見場景

### 添加新表

```sql
CREATE TABLE notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 添加新欄位

```sql
ALTER TABLE users
ADD COLUMN avatar_url VARCHAR(255) NULL COMMENT '頭像URL' AFTER nickname;
```

### 修改欄位類型

```sql
ALTER TABLE tasks
MODIFY COLUMN description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 添加索引

```sql
ALTER TABLE tasks ADD INDEX idx_due_date (due_date);
ALTER TABLE tasks ADD INDEX idx_status_priority (status, priority);
```

### 插入初始數據

```sql
INSERT INTO settings (setting_key, setting_value) VALUES
('site_name', '家庭任務管理系統'),
('default_language', 'zh-TW');
```

## 最佳實踐

1. **一個遷移一個目的**：不要在一個遷移中做太多不相關的事情
2. **描述性命名**：使用清晰的描述性名稱
3. **向後兼容**：如可能，保持向後兼容（如添加欄位時使用 NULL 或 DEFAULT）
4. **測試數據**：遷移後檢查測試數據是否正常
5. **文檔化**：在遷移文件頂部添加註釋說明目的和影響
