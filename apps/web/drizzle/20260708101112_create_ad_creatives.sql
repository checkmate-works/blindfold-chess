CREATE TABLE "ad_creatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(50) NOT NULL,
	"slot" varchar(50) NOT NULL,
	"href" varchar(2048) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"target_country" varchar(2),
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "ad_banners" CASCADE;--> statement-breakpoint
CREATE INDEX "idx_ad_creatives_slot_active" ON "ad_creatives" USING btree ("slot","is_active");