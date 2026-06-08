-- Migration: Add categories table for task categorization
-- Created: 2025-10-09
-- Description: 添加類別表，支持任務分類功能

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    team_id INT UNSIGNED NOT NULL COMMENT '團隊 ID',
    name VARCHAR(50) NOT NULL COMMENT '類別名稱',
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6' COMMENT '類別顏色（HEX 格式）',
    creator_id INT UNSIGNED NOT NULL COMMENT '創建者 ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',

    -- Indexes
    UNIQUE KEY unique_team_category (team_id, name) COMMENT '團隊內類別名稱唯一',
    KEY idx_team_id (team_id) COMMENT '團隊 ID 索引',
    KEY idx_creator_id (creator_id) COMMENT '創建者索引',

    -- Foreign keys
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE COMMENT '團隊刪除時級聯刪除類別',
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE COMMENT '用戶刪除時級聯刪除類別'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任務類別表';

-- Add category_id column to tasks table
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS category_id INT UNSIGNED NULL COMMENT '類別 ID' AFTER parent_task_id,
    ADD KEY IF NOT EXISTS idx_category_id (category_id) COMMENT '類別索引',
    ADD CONSTRAINT fk_tasks_category FOREIGN KEY IF NOT EXISTS (category_id)
        REFERENCES categories(id) ON DELETE SET NULL COMMENT '類別刪除時將任務的類別設為 NULL';
