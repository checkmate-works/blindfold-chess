CREATE TABLE "challenge_best_scores" (
	"user_id" uuid NOT NULL,
	"menu_type" varchar(30) NOT NULL,
	"leaderboard_key" varchar(20) NOT NULL,
	"score" integer NOT NULL,
	"incorrect_answers" integer DEFAULT 0 NOT NULL,
	"time_taken" integer NOT NULL,
	"achieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "challenge_best_scores_user_id_menu_type_leaderboard_key_pk" PRIMARY KEY("user_id","menu_type","leaderboard_key")
);
--> statement-breakpoint
CREATE TABLE "challenge_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"menu_type" varchar(30) NOT NULL,
	"leaderboard_key" varchar(20) NOT NULL,
	"score" integer NOT NULL,
	"incorrect_answers" integer DEFAULT 0 NOT NULL,
	"time_taken" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "practice_sessions" CASCADE;--> statement-breakpoint
CREATE INDEX "idx_cbs_ranking" ON "challenge_best_scores" USING btree ("menu_type", "leaderboard_key", "score" DESC, "incorrect_answers" ASC, "time_taken" ASC);--> statement-breakpoint
CREATE INDEX "idx_cr_period_ranking" ON "challenge_results" USING btree ("menu_type", "leaderboard_key", "created_at" DESC, "score" DESC, "incorrect_answers" ASC, "time_taken" ASC);--> statement-breakpoint
CREATE INDEX "idx_cr_user" ON "challenge_results" USING btree ("user_id","menu_type");