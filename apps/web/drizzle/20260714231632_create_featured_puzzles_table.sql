CREATE TABLE "featured_puzzles" (
	"position_id" uuid PRIMARY KEY NOT NULL,
	"featured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "featured_puzzles" ADD CONSTRAINT "featured_puzzles_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE cascade ON UPDATE no action;