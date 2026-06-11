ALTER TABLE `tasks` ADD `project_id` integer REFERENCES tasks(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX `idx_project` ON `tasks` (`project_id`);