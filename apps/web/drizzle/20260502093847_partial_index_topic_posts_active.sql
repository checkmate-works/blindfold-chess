DROP INDEX "idx_topic_posts_topic";--> statement-breakpoint
CREATE INDEX "idx_topic_posts_topic" ON "topic_posts" USING btree ("topic_type","topic_key") WHERE deleted_at IS NULL;