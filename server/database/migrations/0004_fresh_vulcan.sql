CREATE TABLE `branch` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workshop_id` integer NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workshop_id`) REFERENCES `workshops`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `file_name_idx` ON `files` (`name`);--> statement-breakpoint
CREATE INDEX `file_workshop_idx` ON `files` (`workshop_id`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `name_idx` ON `users` (`name`);--> statement-breakpoint
CREATE INDEX `workshop_name_idx` ON `workshops` (`name`);--> statement-breakpoint
CREATE INDEX `workshop_desc_idx` ON `workshops` (`description`);--> statement-breakpoint
CREATE INDEX `workshop_owner_idx` ON `workshops` (`owner_id`);