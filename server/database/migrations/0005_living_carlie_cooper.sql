PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_feedback`("id", "user_id", "title", "message", "created_at") SELECT "id", "user_id", "title", "message", "created_at" FROM `feedback`;--> statement-breakpoint
DROP TABLE `feedback`;--> statement-breakpoint
ALTER TABLE `__new_feedback` RENAME TO `feedback`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_branch` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workshop_id` integer NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workshop_id`) REFERENCES `workshops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_branch`("id", "workshop_id", "name", "created_at", "updated_at") SELECT "id", "workshop_id", "name", "created_at", "updated_at" FROM `branch`;--> statement-breakpoint
DROP TABLE `branch`;--> statement-breakpoint
ALTER TABLE `__new_branch` RENAME TO `branch`;--> statement-breakpoint
CREATE TABLE `__new_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workshop_id` integer NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`file_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workshop_id`) REFERENCES `workshops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_files`("id", "workshop_id", "name", "path", "file_type", "size", "created_at", "updated_at") SELECT "id", "workshop_id", "name", "path", "file_type", "size", "created_at", "updated_at" FROM `files`;--> statement-breakpoint
DROP TABLE `files`;--> statement-breakpoint
ALTER TABLE `__new_files` RENAME TO `files`;--> statement-breakpoint
CREATE INDEX `file_name_idx` ON `files` (`name`);--> statement-breakpoint
CREATE INDEX `file_workshop_idx` ON `files` (`workshop_id`);--> statement-breakpoint
CREATE TABLE `__new_stars` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`likeable_id` integer NOT NULL,
	`likeable_type` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_stars`("id", "user_id", "likeable_id", "likeable_type") SELECT "id", "user_id", "likeable_id", "likeable_type" FROM `stars`;--> statement-breakpoint
DROP TABLE `stars`;--> statement-breakpoint
ALTER TABLE `__new_stars` RENAME TO `stars`;--> statement-breakpoint
CREATE TABLE `__new_workshops` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`visibility` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_workshops`("id", "owner_id", "name", "description", "visibility", "created_at", "updated_at") SELECT "id", "owner_id", "name", "description", "visibility", "created_at", "updated_at" FROM `workshops`;--> statement-breakpoint
DROP TABLE `workshops`;--> statement-breakpoint
ALTER TABLE `__new_workshops` RENAME TO `workshops`;--> statement-breakpoint
CREATE INDEX `workshop_name_idx` ON `workshops` (`name`);--> statement-breakpoint
CREATE INDEX `workshop_desc_idx` ON `workshops` (`description`);--> statement-breakpoint
CREATE INDEX `workshop_owner_idx` ON `workshops` (`owner_id`);