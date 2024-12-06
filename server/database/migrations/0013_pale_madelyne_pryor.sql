ALTER TABLE `feedback` RENAME TO `appFeedbacks`;--> statement-breakpoint
DROP TABLE `comments`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_appFeedbacks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_appFeedbacks`("id", "user_id", "title", "message", "created_at") SELECT "id", "user_id", "title", "message", "created_at" FROM `appFeedbacks`;--> statement-breakpoint
DROP TABLE `appFeedbacks`;--> statement-breakpoint
ALTER TABLE `__new_appFeedbacks` RENAME TO `appFeedbacks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `files` ADD `branch_id` integer NOT NULL REFERENCES branch(id);