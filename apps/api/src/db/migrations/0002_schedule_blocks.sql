CREATE TABLE `schedule_blocks` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` integer NOT NULL,
  `title` text NOT NULL,
  `location` text,
  `start_date` text NOT NULL,
  `end_date` text NOT NULL,
  `color` text DEFAULT '#0EA5E9' NOT NULL,
  `note` text,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `idx_schedule_user_start_end` ON `schedule_blocks` (`user_id`,`start_date`,`end_date`);
