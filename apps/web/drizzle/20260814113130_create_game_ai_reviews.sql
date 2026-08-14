CREATE TABLE "game_ai_reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"locale" varchar(10) NOT NULL,
	"content" jsonb NOT NULL,
	"moments" jsonb NOT NULL,
	"summary_stats" jsonb NOT NULL,
	"model" varchar(100) NOT NULL,
	"generated_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_game_ai_reviews_game_locale" UNIQUE("game_id","locale")
);
--> statement-breakpoint
ALTER TABLE "game_ai_reviews" ADD CONSTRAINT "game_ai_reviews_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;