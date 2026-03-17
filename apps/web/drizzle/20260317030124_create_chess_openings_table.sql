CREATE TABLE "chess_openings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"eco_code" varchar(3) NOT NULL,
	"pgn" text NOT NULL,
	"fen" varchar(100) NOT NULL,
	"first_move_square" varchar(2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chess_openings_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "idx_chess_openings_first_move_square" ON "chess_openings" USING btree ("first_move_square");--> statement-breakpoint
CREATE INDEX "idx_chess_openings_eco_code" ON "chess_openings" USING btree ("eco_code");