-- Kind-specific creative fields move out of the `payload` JSONB column into
-- columns of their own, and per-locale copy moves into a child table, so the
-- database can hold the invariants the application used to keep in a type
-- guard: a tile has an emoji and no author row, a card has no emoji, alt text
-- goes only with an image, and the English copy every locale falls back to is
-- complete. The JSONB guard enforced none of that — a row it could not render
-- was stored anyway and dropped at read time, silently.
--
-- Existing rows are deleted rather than backfilled. The JSONB payload has
-- carried several shapes over its life (bare-string copy, two thumbnail
-- forms), and a backfill would have to handle every one for a table that
-- holds a handful of admin-authored rows, all of which can be re-entered
-- through /admin/ads. Deleting is a deliberate exception to the rule that a
-- stopped creative keeps its row (the affiliate network's clickref is the
-- creative id, so a deleted row orphans its report lines): it is accepted
-- here on the same footing as the banner retirement, the rows being few and
-- the rebuild cheap. The DELETE runs first because the per-kind CHECK below
-- would reject a `native_tile` row whose emoji still lives in the payload.
--
-- The `payload` column itself is dropped by the next migration; splitting the
-- two is what lets drizzle-kit generate both without a rename prompt.
DELETE FROM "ad_creatives";--> statement-breakpoint
CREATE TABLE "ad_creative_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creative_id" uuid NOT NULL,
	"locale" varchar(10) NOT NULL,
	"title" varchar(2000),
	"description" varchar(2000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_ad_creative_translation_locale" UNIQUE("creative_id","locale"),
	CONSTRAINT "ad_creative_translations_chk_says_something" CHECK ("ad_creative_translations"."title" IS NOT NULL OR "ad_creative_translations"."description" IS NOT NULL),
	CONSTRAINT "ad_creative_translations_chk_en_complete" CHECK ("ad_creative_translations"."locale" <> 'en' OR ("ad_creative_translations"."title" IS NOT NULL AND "ad_creative_translations"."description" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "ad_creatives" ADD COLUMN "icon" varchar(16);--> statement-breakpoint
ALTER TABLE "ad_creatives" ADD COLUMN "avatar_image_path" varchar(1024);--> statement-breakpoint
ALTER TABLE "ad_creatives" ADD COLUMN "avatar_alt" varchar(255);--> statement-breakpoint
ALTER TABLE "ad_creatives" ADD COLUMN "thumbnail_fen" varchar(100) DEFAULT 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3' NOT NULL;--> statement-breakpoint
ALTER TABLE "ad_creatives" ADD COLUMN "thumbnail_image_path" varchar(1024);--> statement-breakpoint
ALTER TABLE "ad_creatives" ADD COLUMN "thumbnail_image_alt" varchar(255);--> statement-breakpoint
ALTER TABLE "ad_creative_translations" ADD CONSTRAINT "ad_creative_translations_creative_id_ad_creatives_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."ad_creatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_chk_kind" CHECK ("ad_creatives"."kind" IN ('native_card', 'native_tile'));--> statement-breakpoint
ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_chk_fields_for_kind" CHECK (("ad_creatives"."kind" = 'native_tile' AND "ad_creatives"."icon" IS NOT NULL AND "ad_creatives"."icon" <> '' AND "ad_creatives"."avatar_image_path" IS NULL AND "ad_creatives"."avatar_alt" IS NULL) OR ("ad_creatives"."kind" = 'native_card' AND "ad_creatives"."icon" IS NULL));--> statement-breakpoint
ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_chk_avatar_alt_with_image" CHECK ("ad_creatives"."avatar_alt" IS NULL OR "ad_creatives"."avatar_image_path" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_chk_thumbnail_alt_with_image" CHECK ("ad_creatives"."thumbnail_image_alt" IS NULL OR "ad_creatives"."thumbnail_image_path" IS NOT NULL);