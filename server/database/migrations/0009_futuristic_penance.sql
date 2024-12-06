CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`taggable_id` integer NOT NULL,
	`taggable_type` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
DROP TABLE `taggables`;