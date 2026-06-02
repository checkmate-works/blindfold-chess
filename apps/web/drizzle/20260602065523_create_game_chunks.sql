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
ALTER TABLE "game_chunks" ADD CONSTRAINT "game_chunks_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_chunks" ADD CONSTRAINT "game_chunks_chunk_id_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."chunks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_game_chunks_game_ply" ON "game_chunks" USING btree ("game_id","ply");