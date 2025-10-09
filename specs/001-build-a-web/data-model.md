# Data Model: 家庭協作任務管理系統

**Feature**: 001-build-a-web
**Date**: 2025-01-09
**Database**: MySQL 8.0 (兼容 5.7.8+)
**Charset**: utf8mb4_unicode_ci

---

## 實體關係圖（ER Diagram）

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│   users     │──┐    │team_members  │    ┌─│   teams     │
│             │  │    │              │    │ │             │
│ id (PK)     │  └───▶│ user_id (FK) │◀───┘ │ id (PK)     │
│ username    │       │ team_id (FK) │      │ name        │
│ password    │       │ role (ENUM)  │      │ invite_code │
│ nickname    │       │ joined_at    │      │ created_by  │
│ current_team│◀──────┘              │      │ created_at  │
│ created_at  │                              └──────┬──────┘
└─────────────┘                                     │
       │                                            │
       │                                            │
       │                          ┌─────────────────┘
       │                          │
       │                          ▼
       │                    ┌─────────────┐        ┌──────────────┐
       │                    │   tasks     │───────▶│ categories   │
       │                    │             │        │              │
       │                    │ id (PK)     │        │ id (PK)      │
       └───────────────────▶│ creator_id  │        │ name         │
                            │ assignee_id │        │ team_id (FK) │
                            │ team_id (FK)│        │ creator_id   │
                            │ category_id │        │ color        │
                            │ title       │        │ created_at   │
                            │ status      │        └──────────────┘
                            │ priority    │
                            │ due_date    │
                            │ task_type   │
                            │ created_at  │
                            │ updated_at  │
                            └──────┬──────┘
                                   │
                  ┌────────────────┴───────────────┐
                  │                                │
                  ▼                                ▼
          ┌──────────────┐              ┌──────────────┐
          │notifications │              │task_history  │
          │              │              │              │
          │ id (PK)      │              │ id (PK)      │
          │ user_id (FK) │              │ task_id (FK) │
          │ task_id (FK) │              │ user_id (FK) │
          │ type (ENUM)  │              │ action       │
          │ content      │              │ changes (JSON│
          │ is_read      │              │ created_at   │
          │ created_at   │              └──────────────┘
          └──────────────┘
```

---

## 表結構定義

### 1. users（用戶表）

```sql
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '用戶 ID',
    username VARCHAR(255) NOT NULL UNIQUE COMMENT '用戶名（郵箱）',
    password VARCHAR(255) NOT NULL COMMENT 'bcrypt 哈希密碼',
    nickname VARCHAR(100) NULL COMMENT '用戶暱稱',
    avatar_url VARCHAR(500) NULL COMMENT '頭像 URL',
    current_team_id BIGINT UNSIGNED NULL COMMENT '當前活動團隊 ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',

    INDEX idx_username (username),
    INDEX idx_current_team (current_team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用戶表';
```

### 2. teams（團隊表）

```sql
CREATE TABLE teams (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '團隊 ID',
    name VARCHAR(100) NOT NULL COMMENT '團隊名稱',
    invite_code CHAR(6) NOT NULL UNIQUE COMMENT '6 位邀請碼（排除 0OI1）',
    created_by BIGINT UNSIGNED NOT NULL COMMENT '創建者用戶 ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',

    INDEX idx_invite_code (invite_code),
    INDEX idx_created_by (created_by),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='團隊表';
```

### 3. team_members（團隊成員關聯表）

```sql
CREATE TABLE team_members (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '記錄 ID',
    team_id BIGINT UNSIGNED NOT NULL COMMENT '團隊 ID',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用戶 ID',
    role ENUM('admin', 'member') NOT NULL DEFAULT 'member' COMMENT '角色',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '加入時間',

    UNIQUE KEY uk_team_user (team_id, user_id),
    INDEX idx_team_id (team_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='團隊成員關聯表';
```

### 4. tasks（任務表）

```sql
CREATE TABLE tasks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '任務 ID',
    team_id BIGINT UNSIGNED NOT NULL COMMENT '所屬團隊 ID',
    creator_id BIGINT UNSIGNED NOT NULL COMMENT '創建者用戶 ID',
    assignee_id BIGINT UNSIGNED NOT NULL COMMENT '分配成員 ID',
    category_id BIGINT UNSIGNED NULL COMMENT '類別 ID',
    title VARCHAR(255) NOT NULL COMMENT '任務標題',
    description TEXT NULL COMMENT '任務描述',
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT '狀態',
    priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium' COMMENT '優先級',
    due_date DATE NULL COMMENT '截止日期',
    task_type ENUM('normal', 'recurring', 'repeatable') NOT NULL DEFAULT 'normal' COMMENT '任務類型',
    recurrence_config JSON NULL COMMENT '週期任務配置（JSON）',
    parent_task_id BIGINT UNSIGNED NULL COMMENT '父任務 ID（週期任務）',
    completed_at TIMESTAMP NULL COMMENT '完成時間',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',

    INDEX idx_team_id (team_id),
    INDEX idx_creator_id (creator_id),
    INDEX idx_assignee_id (assignee_id),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date),
    INDEX idx_team_status (team_id, status),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任務表';
```

### 5. categories（類別表）

```sql
CREATE TABLE categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '類別 ID',
    team_id BIGINT UNSIGNED NOT NULL COMMENT '所屬團隊 ID',
    name VARCHAR(50) NOT NULL COMMENT '類別名稱',
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6' COMMENT '顏色標記（HEX）',
    creator_id BIGINT UNSIGNED NOT NULL COMMENT '創建者 ID（必須是管理員）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',

    UNIQUE KEY uk_team_name (team_id, name),
    INDEX idx_team_id (team_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='類別表';
```

### 6. notifications（通知表）

```sql
CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '通知 ID',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '接收用戶 ID',
    task_id BIGINT UNSIGNED NULL COMMENT '關聯任務 ID',
    type ENUM('due_reminder', 'task_assigned', 'status_changed', 'team_invite') NOT NULL COMMENT '通知類型',
    content TEXT NOT NULL COMMENT '通知內容',
    is_read BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否已讀',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',

    INDEX idx_user_id (user_id),
    INDEX idx_user_unread (user_id, is_read),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表';
```

### 7. task_history（任務歷史表）

```sql
CREATE TABLE task_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '記錄 ID',
    task_id BIGINT UNSIGNED NOT NULL COMMENT '任務 ID',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '操作用戶 ID',
    action ENUM('created', 'updated', 'deleted', 'status_changed', 'assigned') NOT NULL COMMENT '操作類型',
    changes JSON NOT NULL COMMENT '變更內容（JSON）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '操作時間',

    INDEX idx_task_id (task_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任務歷史表';
```

---

## 索引策略

### 單欄索引
- `users.username`: 登錄查詢
- `teams.invite_code`: 加入團隊查詢
- `tasks.status`: 狀態篩選

### 複合索引
- `team_members(team_id, user_id)`: 唯一鍵，防止重複加入
- `tasks(team_id, status)`: 團隊任務列表篩選（最常用查詢）
- `notifications(user_id, is_read)`: 未讀通知查詢

---

## 數據約束

### 外鍵約束
- 所有外鍵使用 `ON DELETE CASCADE`（級聯刪除）
- 例外：`tasks.category_id` 使用 `ON DELETE SET NULL`（類別刪除後任務保留）

### 唯一約束
- `users.username`: 防止郵箱重複
- `teams.invite_code`: 防止邀請碼衝突
- `team_members(team_id, user_id)`: 防止重複加入團隊

---

## 數據遷移

完整 SQL 腳本位於：`/Users/zhangkaishen/Documents/home-list-next/database/schema.sql`

執行順序：
1. 創建數據庫：`CREATE DATABASE family_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
2. 執行 schema.sql：`mysql -u root -p family_tasks < database/schema.sql`
3. （可選）導入示例數據：`mysql -u root -p family_tasks < database/seed_demo_tasks.sql`

---

**完成日期**: 2025-01-09
**下一步**: 生成 API 合約（contracts/）
