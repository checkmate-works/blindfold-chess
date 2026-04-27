CREATE TABLE "topic_post_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"source" varchar(20) NOT NULL,
	"source_url" varchar(512),
	"source_game_id" varchar(64),
	"pgn" text NOT NULL,
	"pgn_byte_length" integer NOT NULL,
	"starting_fen" varchar(100),
	"move_count" integer DEFAULT 0 NOT NULL,
	"header_white" varchar(100),
	"header_black" varchar(100),
	"header_result" varchar(10),
	"header_event" varchar(200),
	"header_site" varchar(200),
	"header_date" varchar(20),
	"anonymized" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topic_post_attachments_post_id_unique" UNIQUE("post_id"),
	CONSTRAINT "chk_pgn_byte_length" CHECK ("topic_post_attachments"."pgn_byte_length" > 0 AND "topic_post_attachments"."pgn_byte_length" <= 102400),
	CONSTRAINT "chk_source_valid" CHECK ("topic_post_attachments"."source" IN ('pgn', 'lichess')),
	CONSTRAINT "chk_source_url_required_for_external" CHECK ("topic_post_attachments"."source" = 'pgn' OR "topic_post_attachments"."source_url" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "topic_post_attachments" ADD CONSTRAINT "topic_post_attachments_post_id_topic_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."topic_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_topic_post_attachments_post" ON "topic_post_attachments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_topic_post_attachments_source" ON "topic_post_attachments" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_topic_post_attachments_size" ON "topic_post_attachments" USING btree ("pgn_byte_length");--> statement-breakpoint
CREATE INDEX "idx_topic_post_attachments_source_game" ON "topic_post_attachments" USING btree ("source","source_game_id");