CREATE TABLE "game_chunks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"ply" integer NOT NULL,
	"chunk_id" uuid NOT NULL,
	"suggested_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_game_chunks" UNIQUE("game_id","ply","chunk_id")
);
--> statement-breakpoint
CREATE TABLE "game_comments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"ply" integer,
	"parent_id" uuid,
	"author_id" uuid,
	"body" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"play_settings" jsonb,
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
ALTER TABLE "game_chunks" ADD CONSTRAINT "game_chunks_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_chunks" ADD CONSTRAINT "game_chunks_chunk_id_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."chunks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_comments" ADD CONSTRAINT "game_comments_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_comments" ADD CONSTRAINT "game_comments_parent_id_game_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."game_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_tokens" ADD CONSTRAINT "game_tokens_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_game_chunks_chunk" ON "game_chunks" USING btree ("chunk_id");--> statement-breakpoint
CREATE INDEX "idx_game_comments_game_ply" ON "game_comments" USING btree ("game_id","ply");--> statement-breakpoint
CREATE INDEX "idx_game_comments_parent" ON "game_comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_games_author" ON "games" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_games_public" ON "games" USING btree ("id" DESC NULLS LAST) WHERE deleted_at IS NULL AND status = 'public';--> statement-breakpoint
CREATE INDEX "idx_games_engine_elo" ON "games" USING btree ("engine_elo");--> statement-breakpoint
CREATE INDEX "idx_games_clean_rate" ON "games" USING btree ("clean_rate");