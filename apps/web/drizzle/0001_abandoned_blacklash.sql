CREATE TABLE "topic_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"topic_type" varchar(50) NOT NULL,
	"topic_key" varchar(50) NOT NULL,
	"parent_id" uuid,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_topic_posts_topic" ON "topic_posts" USING btree ("topic_type","topic_key");--> statement-breakpoint
CREATE INDEX "idx_topic_posts_user" ON "topic_posts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_topic_posts_parent" ON "topic_posts" USING btree ("parent_id");