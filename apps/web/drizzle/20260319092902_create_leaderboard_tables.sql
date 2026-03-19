CREATE TABLE "leaderboard_best_scores" (
	"user_id" uuid NOT NULL,
	"menu_type" varchar(30) NOT NULL,
	"leaderboard_key" varchar(20) NOT NULL,
	"score" integer NOT NULL,
	"incorrect_answers" integer DEFAULT 0 NOT NULL,
	"time_taken" integer NOT NULL,
	"session_id" uuid,
	"achieved_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leaderboard_best_scores_user_id_menu_type_leaderboard_key_pk" PRIMARY KEY("user_id","menu_type","leaderboard_key")
);
--> statement-breakpoint
CREATE TABLE "leaderboard_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid,
	"menu_type" varchar(30) NOT NULL,
	"leaderboard_key" varchar(20) NOT NULL,
	"score" integer NOT NULL,
	"incorrect_answers" integer DEFAULT 0 NOT NULL,
	"time_taken" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leaderboard_entries_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
ALTER TABLE "leaderboard_best_scores" ADD CONSTRAINT "leaderboard_best_scores_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_lb_best_ranking" ON "leaderboard_best_scores" USING btree ("menu_type", "leaderboard_key", "score" DESC, "incorrect_answers" ASC, "time_taken" ASC);--> statement-breakpoint
CREATE INDEX "idx_lb_entries_period_ranking" ON "leaderboard_entries" USING btree ("menu_type", "leaderboard_key", "created_at" DESC, "score" DESC, "incorrect_answers" ASC, "time_taken" ASC);--> statement-breakpoint
CREATE INDEX "idx_lb_entries_user" ON "leaderboard_entries" USING btree ("user_id","menu_type");