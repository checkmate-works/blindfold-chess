CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"actor_id" uuid,
	"type" varchar(50) NOT NULL,
	"target_type" varchar(50),
	"target_id" uuid,
	"group_key" varchar(255),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_notifications_user_created" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_unread" ON "notifications" USING btree ("user_id") WHERE read = false;--> statement-breakpoint
CREATE INDEX "idx_notifications_dedup" ON "notifications" USING btree ("user_id","type","actor_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_group_key" ON "notifications" USING btree ("user_id","group_key");--> statement-breakpoint
CREATE INDEX "idx_notifications_actor" ON "notifications" USING btree ("actor_id");