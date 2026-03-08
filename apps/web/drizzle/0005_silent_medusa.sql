CREATE TABLE "moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"target_type" varchar(50) NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_moderation_actions_actor" ON "moderation_actions" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_moderation_actions_target" ON "moderation_actions" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_moderation_actions_action" ON "moderation_actions" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_moderation_actions_created" ON "moderation_actions" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "ban_reason";