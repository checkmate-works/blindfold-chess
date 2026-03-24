CREATE TABLE "feed_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_feed_items_created" ON "feed_items" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_feed_items_actor" ON "feed_items" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_feed_items_entity" ON "feed_items" USING btree ("entity_type","entity_id");