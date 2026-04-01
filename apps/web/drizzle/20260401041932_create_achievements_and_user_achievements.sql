CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"category" varchar(50) NOT NULL,
	"icon_key" varchar(100) NOT NULL,
	"criteria" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"repeatable" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "achievements_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"achievement_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"achieved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_achievements_achievement" ON "user_achievements" USING btree ("achievement_id");--> statement-breakpoint
CREATE INDEX "idx_user_achievements_user_achievement" ON "user_achievements" USING btree ("user_id","achievement_id");