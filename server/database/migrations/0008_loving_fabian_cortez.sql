ALTER TABLE `tags` RENAME TO `taggables`;--> statement-breakpoint
ALTER TABLE `taggables` RENAME COLUMN "updated_at" TO "taggable_id";--> statement-breakpoint
DROP INDEX IF EXISTS `tags_name_unique`;--> statement-breakpoint
ALTER TABLE `taggables` ADD `taggable_type` text NOT NULL;--> statement-breakpoint
ALTER TABLE `folder` ADD `description` text;