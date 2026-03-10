CREATE TABLE "user_activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"target_type" varchar(50),
	"target_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_user_activity_log_user" ON "user_activity_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_activity_log_action" ON "user_activity_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_user_activity_log_target" ON "user_activity_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_user_activity_log_created" ON "user_activity_log" USING btree ("created_at");