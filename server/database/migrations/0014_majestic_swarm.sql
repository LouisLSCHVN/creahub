ALTER TABLE `appFeedbacks` RENAME TO `appFeedback`;--> statement-breakpoint
ALTER TABLE `files` RENAME TO `file`;--> statement-breakpoint
ALTER TABLE `stars` RENAME TO `star`;--> statement-breakpoint
ALTER TABLE `tags` RENAME TO `tag`;--> statement-breakpoint
ALTER TABLE `users` RENAME TO `user`;--> statement-breakpoint
ALTER TABLE `workshops` RENAME TO `workshop`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_appFeedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_appFeedback`("id", "user_id", "title", "message", "created_at") SELECT "id", "user_id", "title", "message", "created_at" FROM `appFeedback`;--> statement-breakpoint
DROP TABLE `appFeedback`;--> statement-breakpoint
ALTER TABLE `__new_appFeedback` RENAME TO `appFeedback`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_file` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workshop_id` integer NOT NULL,
	`branch_id` integer NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`folder_id` integer NOT NULL,
	`file_type` text NOT NULL,
	`size` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workshop_id`) REFERENCES `workshop`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`folder_id`) REFERENCES `folder`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_file`("id", "workshop_id", "branch_id", "name", "path", "folder_id", "file_type", "size", "version", "created_at", "updated_at") SELECT "id", "workshop_id", "branch_id", "name", "path", "folder_id", "file_type", "size", "version", "created_at", "updated_at" FROM `file`;--> statement-breakpoint
DROP TABLE `file`;--> statement-breakpoint
ALTER TABLE `__new_file` RENAME TO `file`;--> statement-breakpoint
CREATE INDEX `file_name_idx` ON `file` (`name`);--> statement-breakpoint
CREATE INDEX `file_workshop_idx` ON `file` (`workshop_id`);--> statement-breakpoint
CREATE TABLE `__new_star` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`likeable_id` integer NOT NULL,
	`likeable_type` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_star`("id", "user_id", "likeable_id", "likeable_type") SELECT "id", "user_id", "likeable_id", "likeable_type" FROM `star`;--> statement-breakpoint
DROP TABLE `star`;--> statement-breakpoint
ALTER TABLE `__new_star` RENAME TO `star`;--> statement-breakpoint
DROP INDEX IF EXISTS `users_email_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `__new_workshop` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`visibility` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_workshop`("id", "owner_id", "name", "description", "visibility", "created_at", "updated_at") SELECT "id", "owner_id", "name", "description", "visibility", "created_at", "updated_at" FROM `workshop`;--> statement-breakpoint
DROP TABLE `workshop`;--> statement-breakpoint
ALTER TABLE `__new_workshop` RENAME TO `workshop`;--> statement-breakpoint
CREATE INDEX `workshop_name_idx` ON `workshop` (`name`);--> statement-breakpoint
CREATE INDEX `workshop_desc_idx` ON `workshop` (`description`);--> statement-breakpoint
CREATE INDEX `workshop_owner_idx` ON `workshop` (`owner_id`);--> statement-breakpoint
CREATE TABLE `__new_branch` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workshop_id` integer NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workshop_id`) REFERENCES `workshop`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_branch`("id", "workshop_id", "name", "created_at", "updated_at") SELECT "id", "workshop_id", "name", "created_at", "updated_at" FROM `branch`;--> statement-breakpoint
DROP TABLE `branch`;--> statement-breakpoint
ALTER TABLE `__new_branch` RENAME TO `branch`;--> statement-breakpoint
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
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_folder`("id", "user_id", "branch_id", "parent_folder_id", "name", "description", "icon", "created_at", "updated_at") SELECT "id", "user_id", "branch_id", "parent_folder_id", "name", "description", "icon", "created_at", "updated_at" FROM `folder`;--> statement-breakpoint
DROP TABLE `folder`;--> statement-breakpoint
ALTER TABLE `__new_folder` RENAME TO `folder`;--> statement-breakpoint
CREATE INDEX `folder_user_idx` ON `folder` (`user_id`);--> statement-breakpoint
CREATE INDEX `folder_branch_idx` ON `folder` (`branch_id`);--> statement-breakpoint
CREATE INDEX `folder_parent_folder_idx` ON `folder` (`parent_folder_id`);