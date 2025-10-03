-- Migration: Add Multi-Team Support
-- Date: 2025-10-03
-- Description: Add teams, team_members tables and modify users/tasks for multi-team support

-- ============================================================
-- Step 1: Create teams table
-- ============================================================
CREATE TABLE IF NOT EXISTS `teams` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL COMMENT 'Team name (e.g., "张家", "XX公司产品组")',
    `invite_code` VARCHAR(6) UNIQUE NOT NULL COMMENT '6-character invite code',
    `created_by` INT UNSIGNED NOT NULL COMMENT 'User who created this team',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_invite_code` (`invite_code`),
    INDEX `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Teams/Workspaces';

-- ============================================================
-- Step 2: Create team_members table (many-to-many relationship)
-- ============================================================
CREATE TABLE IF NOT EXISTS `team_members` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `team_id` INT UNSIGNED NOT NULL,
    `user_id` INT UNSIGNED NOT NULL,
    `role` ENUM('admin', 'member') DEFAULT 'member' COMMENT 'Role within the team',
    `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_team_user` (`team_id`, `user_id`),
    INDEX `idx_team_id` (`team_id`),
    INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Team membership';

-- ============================================================
-- Step 3: Add current_team_id to users table
-- ============================================================
ALTER TABLE `users`
ADD COLUMN `current_team_id` INT UNSIGNED NULL COMMENT 'Currently selected team' AFTER `nickname`,
ADD INDEX `idx_current_team` (`current_team_id`);

-- ============================================================
-- Step 4: Add team_id to tasks table (allow NULL first)
-- ============================================================
ALTER TABLE `tasks`
ADD COLUMN `team_id` INT UNSIGNED NULL COMMENT 'Team this task belongs to' AFTER `id`,
ADD INDEX `idx_team_id` (`team_id`);

-- ============================================================
-- Step 5: Add team_id to task_comments table (allow NULL first)
-- ============================================================
ALTER TABLE `task_comments`
ADD COLUMN `team_id` INT UNSIGNED NULL COMMENT 'Team this comment belongs to' AFTER `id`,
ADD INDEX `idx_team_id` (`team_id`);

-- ============================================================
-- Step 6: Migrate existing data
-- ============================================================

-- Create a default team for existing users
INSERT INTO `teams` (`name`, `invite_code`, `created_by`)
SELECT '默认团队', UPPER(SUBSTRING(MD5(RAND()), 1, 6)), MIN(id)
FROM `users`
WHERE EXISTS (SELECT 1 FROM `users`)
LIMIT 1;

-- Get the default team ID
SET @default_team_id = (SELECT id FROM teams WHERE name = '默认团队' LIMIT 1);

-- Add all existing users to the default team
-- First user becomes admin, others become members
INSERT INTO `team_members` (`team_id`, `user_id`, `role`)
SELECT
    @default_team_id,
    id,
    CASE
        WHEN id = (SELECT MIN(id) FROM users) THEN 'admin'
        ELSE 'member'
    END
FROM `users`;

-- Set current_team_id for all existing users
UPDATE `users` SET `current_team_id` = @default_team_id;

-- Associate all existing tasks with the default team
UPDATE `tasks` SET `team_id` = @default_team_id;

-- Associate all existing comments with the default team
UPDATE `task_comments` SET `team_id` = @default_team_id;

-- ============================================================
-- Step 7: Add NOT NULL constraint and foreign keys
-- ============================================================

-- Make tasks.team_id NOT NULL and add foreign key
ALTER TABLE `tasks`
MODIFY COLUMN `team_id` INT UNSIGNED NOT NULL COMMENT 'Team this task belongs to',
ADD FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE;

-- Make task_comments.team_id NOT NULL and add foreign key
ALTER TABLE `task_comments`
MODIFY COLUMN `team_id` INT UNSIGNED NOT NULL COMMENT 'Team this comment belongs to',
ADD FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE;

-- ============================================================
-- Migration Complete
-- ============================================================
