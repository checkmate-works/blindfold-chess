CREATE TABLE "notification_mutes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_notification_mute" UNIQUE("user_id","type")
);
--> statement-breakpoint
CREATE INDEX "idx_notification_mutes_user" ON "notification_mutes" USING btree ("user_id");