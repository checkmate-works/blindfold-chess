DROP INDEX "idx_feed_items_actor";--> statement-breakpoint
CREATE INDEX "idx_feed_items_actor_created" ON "feed_items" USING btree ("actor_id","created_at" DESC NULLS LAST);