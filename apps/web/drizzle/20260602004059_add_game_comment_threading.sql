ALTER TABLE "game_comments" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "game_comments" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "game_comments" ADD CONSTRAINT "game_comments_parent_id_game_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."game_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_game_comments_parent" ON "game_comments" USING btree ("parent_id");