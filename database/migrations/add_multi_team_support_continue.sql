-- Migration: Add Multi-Team Support (Continue from failure point)
-- Date: 2025-10-03
-- Description: Continue migration from where it failed

-- ============================================================
-- Step 4: Add team_id to tasks table (if not exists)
-- ============================================================
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'family_tasks'
    AND TABLE_NAME = 'tasks'
    AND COLUMN_NAME = 'team_id'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE `tasks` ADD COLUMN `team_id` INT UNSIGNED NULL COMMENT ''Team this task belongs to'' AFTER `id`, ADD INDEX `idx_team_id` (`team_id`)',
    'SELECT ''Column team_id already exists in tasks table'''
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- Step 5: Add team_id to task_comments table (if not exists)
-- ============================================================
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'family_tasks'
    AND TABLE_NAME = 'task_comments'
    AND COLUMN_NAME = 'team_id'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE `task_comments` ADD COLUMN `team_id` INT UNSIGNED NULL COMMENT ''Team this comment belongs to'' AFTER `id`, ADD INDEX `idx_team_id` (`team_id`)',
    'SELECT ''Column team_id already exists in task_comments table'''
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- Step 6: Migrate existing data
-- ============================================================

-- Create a default team if not exists
INSERT IGNORE INTO `teams` (`id`, `name`, `invite_code`, `created_by`)
SELECT 1, '默认团队', UPPER(SUBSTRING(MD5(RAND()), 1, 6)), MIN(id)
FROM `users`
WHERE EXISTS (SELECT 1 FROM `users`)
LIMIT 1;

-- Get the default team ID
SET @default_team_id = 1;

-- Add all existing users to the default team (if not already added)
INSERT IGNORE INTO `team_members` (`team_id`, `user_id`, `role`)
SELECT
    @default_team_id,
    id,
    CASE
        WHEN id = (SELECT MIN(id) FROM users) THEN 'admin'
        ELSE 'member'
    END
FROM `users`;

-- Set current_team_id for all existing users (if NULL)
UPDATE `users` SET `current_team_id` = @default_team_id WHERE `current_team_id` IS NULL;

-- Associate all existing tasks with the default team (if NULL)
UPDATE `tasks` SET `team_id` = @default_team_id WHERE `team_id` IS NULL;

-- Associate all existing comments with the default team (if NULL)
UPDATE `task_comments` SET `team_id` = @default_team_id WHERE `team_id` IS NULL;

-- ============================================================
-- Step 7: Add NOT NULL constraint and foreign keys
-- ============================================================

-- Check if foreign key exists for tasks.team_id
SET @fk_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = 'family_tasks'
    AND TABLE_NAME = 'tasks'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    AND CONSTRAINT_NAME LIKE '%team_id%'
);

-- Make tasks.team_id NOT NULL and add foreign key if not exists
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE `tasks` MODIFY COLUMN `team_id` INT UNSIGNED NOT NULL COMMENT ''Team this task belongs to'', ADD FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE',
    'SELECT ''Foreign key already exists for tasks.team_id'''
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if foreign key exists for task_comments.team_id
SET @fk_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = 'family_tasks'
    AND TABLE_NAME = 'task_comments'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    AND CONSTRAINT_NAME LIKE '%team_id%'
);

-- Make task_comments.team_id NOT NULL and add foreign key if not exists
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE `task_comments` MODIFY COLUMN `team_id` INT UNSIGNED NOT NULL COMMENT ''Team this comment belongs to'', ADD FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE',
    'SELECT ''Foreign key already exists for task_comments.team_id'''
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- Migration Complete
-- ============================================================
