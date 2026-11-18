CREATE TABLE "challenge_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"menu_type" varchar(30) NOT NULL,
	"leaderboard_key" varchar(20) NOT NULL,
	"rules_version" integer NOT NULL,
	"settings" jsonb NOT NULL,
	"questions" jsonb NOT NULL,
	"state" jsonb NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"outcome" varchar(30),
	"challenge_result_id" uuid
);
--> statement-breakpoint
CREATE INDEX "idx_ca_user_started" ON "challenge_attempts" USING btree ("user_id","started_at");