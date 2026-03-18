CREATE TABLE "topic_post_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"preference_rating" smallint,
	"proficiency_rating" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topic_post_ratings_post_id_unique" UNIQUE("post_id"),
	CONSTRAINT "chk_rating_range_preference" CHECK ("topic_post_ratings"."preference_rating" IS NULL OR ("topic_post_ratings"."preference_rating" >= 1 AND "topic_post_ratings"."preference_rating" <= 5)),
	CONSTRAINT "chk_rating_range_proficiency" CHECK ("topic_post_ratings"."proficiency_rating" IS NULL OR ("topic_post_ratings"."proficiency_rating" >= 1 AND "topic_post_ratings"."proficiency_rating" <= 5)),
	CONSTRAINT "chk_at_least_one_rating" CHECK ("topic_post_ratings"."preference_rating" IS NOT NULL OR "topic_post_ratings"."proficiency_rating" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "topic_post_ratings" ADD CONSTRAINT "topic_post_ratings_post_id_topic_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."topic_posts"("id") ON DELETE cascade ON UPDATE no action;