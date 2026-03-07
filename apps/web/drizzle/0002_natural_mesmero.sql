CREATE TABLE "topic_post_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_topic_post_like" UNIQUE("user_id","post_id")
);
--> statement-breakpoint
ALTER TABLE "topic_post_likes" ADD CONSTRAINT "topic_post_likes_post_id_topic_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."topic_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_topic_post_likes_post" ON "topic_post_likes" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_topic_post_likes_user" ON "topic_post_likes" USING btree ("user_id");