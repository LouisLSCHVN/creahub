ALTER TABLE `folder` ADD `parent_folder_id` integer NOT NULL REFERENCES folder(id);--> statement-breakpoint
CREATE INDEX `folder_parent_folder_idx` ON `folder` (`parent_folder_id`);