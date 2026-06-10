ALTER TABLE `tasks` ADD `start_date` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `end_date` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `progress` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `is_backlog` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_team_backlog` ON `tasks` (`team_id`,`is_backlog`);