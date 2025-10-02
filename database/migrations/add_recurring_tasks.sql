-- Migration: Add recurring task support
-- Date: 2025-10-02
-- Description: Add task_type, recurrence_config, and parent_task_id columns to tasks table

-- Add task_type column
ALTER TABLE `tasks`
ADD COLUMN `task_type` ENUM('normal', 'recurring', 'repeatable') DEFAULT 'normal'
COMMENT 'Task type: normal, recurring (periodic), or repeatable (copy)'
AFTER `due_date`;

-- Add recurrence_config column
ALTER TABLE `tasks`
ADD COLUMN `recurrence_config` JSON
COMMENT 'Recurrence configuration for recurring tasks'
AFTER `task_type`;

-- Add parent_task_id column
ALTER TABLE `tasks`
ADD COLUMN `parent_task_id` INT UNSIGNED
COMMENT 'Parent task ID for repeatable tasks'
AFTER `recurrence_config`;

-- Add foreign key constraint for parent_task_id
ALTER TABLE `tasks`
ADD CONSTRAINT `fk_parent_task`
FOREIGN KEY (`parent_task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE;

-- Add indexes
ALTER TABLE `tasks` ADD INDEX `idx_task_type` (`task_type`);
ALTER TABLE `tasks` ADD INDEX `idx_parent_task` (`parent_task_id`);

-- Update existing tasks to have task_type = 'normal'
UPDATE `tasks` SET `task_type` = 'normal' WHERE `task_type` IS NULL;
