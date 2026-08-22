CREATE TABLE "game_ai_review_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"locale" varchar(10) NOT NULL,
	"requested_by_id" uuid NOT NULL,
	"evaluations" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_ai_review_jobs" ADD CONSTRAINT "game_ai_review_jobs_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_game_ai_review_jobs_live" ON "game_ai_review_jobs" USING btree ("game_id","locale") WHERE status IN ('pending', 'processing');--> statement-breakpoint
CREATE INDEX "idx_game_ai_review_jobs_status_updated" ON "game_ai_review_jobs" USING btree ("status","updated_at");