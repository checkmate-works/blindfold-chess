CREATE TABLE "game_annotations" (
	"game_id" uuid NOT NULL,
	"ply" integer NOT NULL,
	"note" text,
	"glyph" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_annotations_game_id_ply_pk" PRIMARY KEY("game_id","ply")
);
--> statement-breakpoint
CREATE TABLE "game_comments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"ply" integer,
	"author_id" uuid,
	"body" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_tokens" (
	"game_id" uuid PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY NOT NULL,
	"author_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" text,
	"moves" jsonb NOT NULL,
	"starting_fen" varchar(100),
	"player_color" varchar(5) NOT NULL,
	"engine_config" jsonb NOT NULL,
	"operation_logs" jsonb,
	"result" varchar(4) NOT NULL,
	"engine_kind" varchar(20) NOT NULL,
	"engine_elo" integer NOT NULL,
	"move_count" integer NOT NULL,
	"clean_rate" integer,
	"status" varchar(20) DEFAULT 'public' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_annotations" ADD CONSTRAINT "game_annotations_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_comments" ADD CONSTRAINT "game_comments_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_tokens" ADD CONSTRAINT "game_tokens_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_game_comments_game_ply" ON "game_comments" USING btree ("game_id","ply");--> statement-breakpoint
CREATE INDEX "idx_games_author" ON "games" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_games_public" ON "games" USING btree ("id" DESC NULLS LAST) WHERE deleted_at IS NULL AND status IN ('public', 'unlisted');--> statement-breakpoint
CREATE INDEX "idx_games_engine_elo" ON "games" USING btree ("engine_elo");--> statement-breakpoint
CREATE INDEX "idx_games_clean_rate" ON "games" USING btree ("clean_rate");