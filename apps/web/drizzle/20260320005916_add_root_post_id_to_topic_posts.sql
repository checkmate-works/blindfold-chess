ALTER TABLE "topic_posts" ADD COLUMN "root_post_id" uuid;--> statement-breakpoint
CREATE INDEX "idx_topic_posts_root" ON "topic_posts" USING btree ("root_post_id");--> statement-breakpoint
-- Backfill: All existing replies have parent_id pointing directly to a top-level post
-- (reply-to-reply was not supported before this migration).
UPDATE topic_posts SET root_post_id = parent_id WHERE parent_id IS NOT NULL;