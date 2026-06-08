-- Family Task Manager Database Schema
-- MySQL 5.7.8+ (JSON type support required)
-- Charset: utf8mb4

-- Teams table
CREATE TABLE IF NOT EXISTS `teams` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL COMMENT 'Team name',
    `invite_code` VARCHAR(6) UNIQUE NOT NULL COMMENT '6-character invite code',
    `created_by` INT UNSIGNED NOT NULL COMMENT 'User who created this team',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_invite_code` (`invite_code`),
    INDEX `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Teams/Workspaces';

-- Users table
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) UNIQUE NOT NULL,
    `password` VARCHAR(255) NOT NULL COMMENT 'bcrypt hashed password',
    `nickname` VARCHAR(50) NOT NULL,
    `current_team_id` INT UNSIGNED NULL COMMENT 'Currently selected team',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_username` (`username`),
    INDEX `idx_current_team` (`current_team_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User accounts';

-- Team members table (many-to-many relationship)
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

-- Tasks table
CREATE TABLE IF NOT EXISTS `tasks` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `team_id` INT UNSIGNED NOT NULL COMMENT 'Team this task belongs to',
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT,
    `creator_id` INT UNSIGNED NOT NULL COMMENT 'User who created the task',
    `assignee_id` INT UNSIGNED COMMENT 'User assigned to the task',
    `category_id` INT UNSIGNED NULL COMMENT 'Category ID (optional)',
    `priority` ENUM('low', 'medium', 'high') DEFAULT 'medium',
    `status` ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    `due_date` DATE COMMENT 'Task deadline',
    `task_type` ENUM('normal', 'recurring', 'repeatable') DEFAULT 'normal' COMMENT 'Task type: normal, recurring (periodic), or repeatable (copy)',
    `recurrence_config` JSON COMMENT 'Recurrence configuration for recurring tasks',
    `parent_task_id` INT UNSIGNED COMMENT 'Parent task ID for repeatable tasks',
    `completed_at` TIMESTAMP NULL COMMENT 'Completion time',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`parent_task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
    INDEX `idx_team_id` (`team_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_priority` (`priority`),
    INDEX `idx_creator` (`creator_id`),
    INDEX `idx_assignee` (`assignee_id`),
    INDEX `idx_category` (`category_id`),
    INDEX `idx_due_date` (`due_date`),
    INDEX `idx_task_type` (`task_type`),
    INDEX `idx_parent_task` (`parent_task_id`),
    INDEX `idx_team_status` (`team_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Task records';

-- Task comments table
CREATE TABLE IF NOT EXISTS `task_comments` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `team_id` INT UNSIGNED NOT NULL COMMENT 'Team this comment belongs to',
    `task_id` INT UNSIGNED NOT NULL,
    `user_id` INT UNSIGNED NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_team_id` (`team_id`),
    INDEX `idx_task` (`task_id`),
    INDEX `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Task comments';

-- Categories table (Phase 6 - User Story 4)
CREATE TABLE IF NOT EXISTS `categories` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `team_id` INT UNSIGNED NOT NULL COMMENT 'Team this category belongs to',
    `name` VARCHAR(50) NOT NULL COMMENT 'Category name',
    `color` VARCHAR(7) NOT NULL DEFAULT '#3B82F6' COMMENT 'Color hex code',
    `creator_id` INT UNSIGNED NOT NULL COMMENT 'User who created this category (must be admin)',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_team_category` (`team_id`, `name`),
    INDEX `idx_team_id` (`team_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Task categories';

-- Task history table (Phase 3 - Audit logging)
CREATE TABLE IF NOT EXISTS `task_history` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `task_id` INT UNSIGNED NOT NULL COMMENT 'Task ID',
    `user_id` INT UNSIGNED NOT NULL COMMENT 'User who made the change',
    `action` ENUM('created', 'updated', 'deleted', 'status_changed', 'assigned') NOT NULL COMMENT 'Action type',
    `changes` JSON NOT NULL COMMENT 'Change details in JSON format',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp of the change',
    FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_task_id` (`task_id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Task history/audit log';

-- Notifications table (Phase 7 - User Story 5)
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NOT NULL COMMENT 'User who receives this notification',
    `task_id` INT UNSIGNED NULL COMMENT 'Related task ID',
    `type` ENUM('due_reminder', 'task_assigned', 'status_changed', 'team_invite') NOT NULL COMMENT 'Notification type',
    `content` TEXT NOT NULL COMMENT 'Notification content',
    `is_read` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Read status',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_user_unread` (`user_id`, `is_read`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User notifications';

-- Add foreign key constraint for category_id after categories table is created
ALTER TABLE `tasks` ADD CONSTRAINT `fk_tasks_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL;

-- Default user
-- Username: admin
-- Password: admin123 (bcrypt hash)
INSERT INTO `users` (`username`, `password`, `nickname`)
VALUES ('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator')
ON DUPLICATE KEY UPDATE `username` = `username`;
