CREATE TYPE "public"."app_role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TABLE "ad_banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slot" varchar(50) NOT NULL,
	"href" varchar(2048) NOT NULL,
	"image_path" varchar(1024) NOT NULL,
	"alt" varchar(255) DEFAULT 'Advertisement' NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ad_banners_slot_unique" UNIQUE("slot")
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"locale" varchar(10) NOT NULL,
	"status" varchar(20) DEFAULT 'draft',
	"visibility" varchar(20) DEFAULT 'public',
	"pinned_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_announcements_slug_locale" UNIQUE("slug","locale")
);
--> statement-breakpoint
CREATE TABLE "article_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "article_category_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"locale" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_category_translation_locale" UNIQUE("category_id","locale")
);
--> statement-breakpoint
CREATE TABLE "article_practice_modules" (
	"article_id" uuid NOT NULL,
	"practice_module_id" varchar(100) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "uq_article_practice_module" UNIQUE("article_id","practice_module_id")
);
--> statement-breakpoint
CREATE TABLE "article_tags" (
	"article_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "uq_article_tag" UNIQUE("article_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"excerpt" text,
	"description" text,
	"content" text NOT NULL,
	"locale" varchar(10) NOT NULL,
	"status" varchar(20) DEFAULT 'draft',
	"category_id" uuid,
	"display_order" integer DEFAULT 0 NOT NULL,
	"icon" varchar(10),
	"pinned_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_articles_slug_locale" UNIQUE("slug","locale")
);
--> statement-breakpoint
CREATE TABLE "glossary_term_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term_id" uuid NOT NULL,
	"alias" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_term_alias" UNIQUE("term_id","alias")
);
--> statement-breakpoint
CREATE TABLE "glossary_term_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term_id" uuid NOT NULL,
	"fen" varchar(100) NOT NULL,
	"sort_order" integer DEFAULT 0,
	"caption" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_term_position" UNIQUE("term_id","fen")
);
--> statement-breakpoint
CREATE TABLE "glossary_term_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term_id" uuid NOT NULL,
	"related_term_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_term_relation" UNIQUE("term_id","related_term_id")
);
--> statement-breakpoint
CREATE TABLE "glossary_term_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term_id" uuid NOT NULL,
	"locale" varchar(10) NOT NULL,
	"term" varchar(255) NOT NULL,
	"definition" text NOT NULL,
	"reading" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_term_locale" UNIQUE("term_id","locale")
);
--> statement-breakpoint
CREATE TABLE "glossary_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"term_en" varchar(255) NOT NULL,
	"category" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "glossary_terms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"target_type" varchar(50) NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"actor_id" uuid,
	"type" varchar(50) NOT NULL,
	"target_type" varchar(50),
	"target_id" uuid,
	"group_key" varchar(255),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"menu_type" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"result" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"avatar_url" varchar(1024),
	"bio" text,
	"country" varchar(2),
	"flair" varchar(50),
	"fide_id" varchar(50),
	"chesscom_username" varchar(255),
	"lichess_username" varchar(255),
	"banned_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "rate_limit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "topic_post_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_topic_post_like" UNIQUE("user_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "topic_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"topic_type" varchar(50) NOT NULL,
	"topic_key" varchar(50) NOT NULL,
	"parent_id" uuid,
	"content" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"target_type" varchar(50),
	"target_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_user_block" UNIQUE("blocker_id","blocked_id"),
	CONSTRAINT "chk_no_self_block" CHECK ("user_blocks"."blocker_id" != "user_blocks"."blocked_id")
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_user_follow" UNIQUE("follower_id","following_id"),
	CONSTRAINT "chk_no_self_follow" CHECK ("user_follows"."follower_id" != "user_follows"."following_id")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "app_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_user_role" UNIQUE("user_id","role")
);
--> statement-breakpoint
ALTER TABLE "article_category_translations" ADD CONSTRAINT "article_category_translations_category_id_article_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."article_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_practice_modules" ADD CONSTRAINT "article_practice_modules_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_article_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."article_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glossary_term_aliases" ADD CONSTRAINT "glossary_term_aliases_term_id_glossary_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."glossary_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glossary_term_positions" ADD CONSTRAINT "glossary_term_positions_term_id_glossary_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."glossary_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glossary_term_relations" ADD CONSTRAINT "glossary_term_relations_term_id_glossary_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."glossary_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glossary_term_relations" ADD CONSTRAINT "glossary_term_relations_related_term_id_glossary_terms_id_fk" FOREIGN KEY ("related_term_id") REFERENCES "public"."glossary_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glossary_term_translations" ADD CONSTRAINT "glossary_term_translations_term_id_glossary_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."glossary_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_post_likes" ADD CONSTRAINT "topic_post_likes_post_id_topic_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."topic_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ad_banners_active" ON "ad_banners" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_articles_category" ON "articles" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_moderation_actions_actor" ON "moderation_actions" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_moderation_actions_target" ON "moderation_actions" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_moderation_actions_action" ON "moderation_actions" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_moderation_actions_created" ON "moderation_actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_created" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_unread" ON "notifications" USING btree ("user_id") WHERE is_read = false;--> statement-breakpoint
CREATE INDEX "idx_notifications_dedup" ON "notifications" USING btree ("user_id","type","actor_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_group_key" ON "notifications" USING btree ("user_id","group_key");--> statement-breakpoint
CREATE INDEX "idx_notifications_actor" ON "notifications" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_practice_sessions_user" ON "practice_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_practice_sessions_menu" ON "practice_sessions" USING btree ("user_id","menu_type");--> statement-breakpoint
CREATE INDEX "idx_practice_sessions_recent" ON "practice_sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "idx_rate_limit_events_lookup" ON "rate_limit_events" USING btree ("user_id","action","created_at");--> statement-breakpoint
CREATE INDEX "idx_topic_post_likes_post" ON "topic_post_likes" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_topic_post_likes_user" ON "topic_post_likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_topic_posts_topic" ON "topic_posts" USING btree ("topic_type","topic_key");--> statement-breakpoint
CREATE INDEX "idx_topic_posts_user" ON "topic_posts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_topic_posts_parent" ON "topic_posts" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_user_activity_log_user" ON "user_activity_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_activity_log_action" ON "user_activity_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_user_activity_log_target" ON "user_activity_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_user_activity_log_created" ON "user_activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_user_blocks_blocker" ON "user_blocks" USING btree ("blocker_id");--> statement-breakpoint
CREATE INDEX "idx_user_blocks_blocked" ON "user_blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "idx_user_follows_follower" ON "user_follows" USING btree ("follower_id");--> statement-breakpoint
CREATE INDEX "idx_user_follows_following" ON "user_follows" USING btree ("following_id");