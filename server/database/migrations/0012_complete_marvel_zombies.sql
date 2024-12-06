PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_folder` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`branch_id` integer NOT NULL,
	`parent_folder_id` integer,
	`name` text NOT NULL,
	`description` text,
	`icon` text DEFAULT 'i-heroicons-folder' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_folder`("id", "user_id", "branch_id", "parent_folder_id", "name", "description", "icon", "created_at", "updated_at") SELECT "id", "user_id", "branch_id", "parent_folder_id", "name", "description", "icon", "created_at", "updated_at" FROM `folder`;--> statement-breakpoint
DROP TABLE `folder`;--> statement-breakpoint
ALTER TABLE `__new_folder` RENAME TO `folder`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `folder_user_idx` ON `folder` (`user_id`);--> statement-breakpoint
CREATE INDEX `folder_branch_idx` ON `folder` (`branch_id`);--> statement-breakpoint
CREATE INDEX `folder_parent_folder_idx` ON `folder` (`parent_folder_id`);