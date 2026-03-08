CREATE TABLE "blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_block" UNIQUE("blocker_id","blocked_id")
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_follow" UNIQUE("follower_id","following_id")
);
--> statement-breakpoint
CREATE INDEX "idx_blocks_blocker" ON "blocks" USING btree ("blocker_id");--> statement-breakpoint
CREATE INDEX "idx_blocks_blocked" ON "blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "idx_follows_follower" ON "follows" USING btree ("follower_id");--> statement-breakpoint
CREATE INDEX "idx_follows_following" ON "follows" USING btree ("following_id");